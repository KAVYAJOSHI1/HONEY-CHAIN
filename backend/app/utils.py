import base64
import io
import os
import socket

import qrcode


def _lan_ip() -> str:
    """This machine's LAN address, so QR codes scanned by a phone on the same network resolve."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("10.255.255.255", 1))  # UDP connect sends no packets; it only picks a route
            return s.getsockname()[0]
    except OSError:
        return "localhost"


# "localhost" in a QR code points at the scanning phone itself, so default to the LAN address.
FRONTEND_URL = (os.getenv("FRONTEND_URL") or f"http://{_lan_ip()}:3000").rstrip("/")


def verification_url(batch_id: str) -> str:
    """Public consumer verification page for a batch."""
    return f"{FRONTEND_URL}/consumer/{batch_id}"


def generate_qr_code(batch_id: str) -> str:
    """QR code (PNG data URI) pointing to the consumer verification page."""
    qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    qr.add_data(verification_url(batch_id))
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")
