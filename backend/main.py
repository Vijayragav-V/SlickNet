from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException
)

from fastapi.middleware.cors import (
    CORSMiddleware
)

from pathlib import Path
from io import BytesIO

import base64
import json
import os

import cv2
import numpy as np

import torch

from PIL import Image

from torchvision.transforms import (
    functional as TF
)

from torchvision.transforms import (
    InterpolationMode
)

from backend.model import UNet


ROOT = Path(
    __file__
).resolve().parents[1]

MODEL_PATH = (
    ROOT
    / "models"
    / "slicknet_v1_1.pth"
)

CONFIG_PATH = (
    ROOT
    / "models"
    / "slicknet_v1_1_config.json"
)


with open(
    CONFIG_PATH,
    "r"
) as f:

    CONFIG = json.load(f)


HEIGHT = CONFIG[
    "input_height"
]

WIDTH = CONFIG[
    "input_width"
]

THRESHOLD = CONFIG[
    "threshold"
]

MIN_PIXELS = CONFIG[
    "min_pixels"
]


DEVICE = torch.device(
    "cpu"
)

print(
    "Model config:",
    HEIGHT,
    WIDTH,
    THRESHOLD,
    MIN_PIXELS
)

model = UNet()

state_dict = torch.load(
    MODEL_PATH,
    map_location=DEVICE
)

model.load_state_dict(
    state_dict
)

model.to(DEVICE)

model.eval()


app = FastAPI(
    title="SlickNet API",
    version="1.0"
)


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]

frontend_origin = os.getenv(
    "FRONTEND_ORIGIN"
)

if frontend_origin:

    origins.append(
        frontend_origin
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


def remove_small_components(
    mask
):

    num_labels, labels, stats, _ = (
        cv2.connectedComponentsWithStats(
            mask.astype(np.uint8),
            connectivity=8
        )
    )

    cleaned = np.zeros_like(
        mask,
        dtype=np.uint8
    )

    component_count = 0

    for label_id in range(
        1,
        num_labels
    ):

        area = stats[
            label_id,
            cv2.CC_STAT_AREA
        ]

        if area >= MIN_PIXELS:

            cleaned[
                labels == label_id
            ] = 1

            component_count += 1

    return (
        cleaned,
        component_count
    )


def image_to_data_url(
    image
):

    buffer = BytesIO()

    image.save(
        buffer,
        format="PNG"
    )

    encoded = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")

    return (
        "data:image/png;base64,"
        + encoded
    )


@app.get("/health")
def health():

    return {
        "status": "ok",
        "model": "SlickNet V1.1",
        "input_size": {
            "height": HEIGHT,
            "width": WIDTH
        },
        "threshold": THRESHOLD,
        "min_pixels": MIN_PIXELS,
        "device": str(DEVICE)
    }

@app.post("/analyze")
async def analyze(
    file: UploadFile = File(...)
):

    raw_bytes = await file.read()

    try:

        original = Image.open(
            BytesIO(raw_bytes)
        ).convert("RGB")

    except Exception:

        raise HTTPException(
            status_code=400,
            detail="Invalid image file."
        )


    original_size = (
        original.size
    )


    resized = TF.resize(
        original,
        [HEIGHT, WIDTH],
        interpolation=InterpolationMode.BILINEAR
    )


    tensor = (
        TF.to_tensor(resized)
        .unsqueeze(0)
        .to(DEVICE)
    )


    with torch.no_grad():

        logits = model(
            tensor
        )

        probability = torch.sigmoid(
            logits
        )[0, 0].cpu().numpy()


    raw_prediction = (
        probability
        >= THRESHOLD
    ).astype(np.uint8)


    cleaned_prediction, component_count = (
        remove_small_components(
            raw_prediction
        )
    )


    predicted_pixels = (
        cleaned_prediction
        == 1
    )


    if predicted_pixels.any():

        mean_probability = float(
            probability[
                predicted_pixels
            ].mean()
        )

    else:

        mean_probability = 0.0


    coverage_percent = float(
        cleaned_prediction.mean()
        * 100
    )


    mask_image = Image.fromarray(
        cleaned_prediction
        * 255
    ).convert("L")


    mask_image = mask_image.resize(
        original_size,
        resample=Image.Resampling.NEAREST
    )


    original_array = np.array(
        original
    ).astype(np.float32)


    mask_array = (
        np.array(mask_image)
        > 0
    )


    overlay = (
        original_array.copy()
    )


    red = np.array(
        [255, 0, 0],
        dtype=np.float32
    )


    overlay[mask_array] = (
        0.55
        * overlay[mask_array]
        +
        0.45
        * red
    )


    overlay = np.clip(
        overlay,
        0,
        255
    ).astype(np.uint8)


    overlay_image = (
        Image.fromarray(
            overlay
        )
    )


    return {
        "oil_coverage_percent":
            coverage_percent,

        "component_count":
            component_count,

        "mean_oil_probability":
            mean_probability,

        "threshold":
            THRESHOLD,

        "min_pixels":
            MIN_PIXELS,

        "mask_data_url":
            image_to_data_url(
                mask_image
            ),

        "overlay_data_url":
            image_to_data_url(
                overlay_image
            )
    }