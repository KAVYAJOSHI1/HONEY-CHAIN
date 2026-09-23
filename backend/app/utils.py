import hashlib
import json
import base64
import io
import qrcode

def upload_to_ipfs_mock(batch_data: dict) -> str:
    """
    Mocks uploading data to IPFS. In a real environment, 
    this would pin the JSON to Pinata/Infura and return the CID.
    We'll return a deterministic mock CID based on the data.
    """
    data_str = json.dumps(batch_data, sort_keys=True)
    hash_obj = hashlib.sha256(data_str.encode('utf-8')).digest()
    # Create a mock IPFS CID starting with 'Qm'
    b64_str = base64.b64encode(hash_obj).decode('utf-8').replace('+', 'X').replace('/', 'Y').replace('=', '')
    mock_cid = "Qm" + b64_str[:44]
    return f"ipfs://{mock_cid}"

def generate_qr_code(batch_id: str, base_url: str = "https://honeychain.app/consumer/") -> str:
    """
    Generates a QR code pointing to the consumer verification page.
    Returns the QR code image as a base64 string.
    """
    url = f"{base_url}{batch_id}"
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return f"data:image/png;base64,{img_str}"
