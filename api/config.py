import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    ENV = os.getenv("ENV",  "local")

    KEY_API = os.getenv("KEY_API")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)

    MAIL_SERVER = "smtp.gmail.com"
    MAIL_PORT = 587
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.getenv("MAIL_USERNAME")
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
    MAIL_DEFAULT_SENDER = os.getenv("MAIL_USERNAME", "no-reply@localhost")

    RESEND_API_KEY = os.getenv("RESEND_API_KEY")

    APP_URL = os.getenv("APP_URL", "http://localhost:5000")
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")


class DesenvolvimentoConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///" + os.path.join(os.path.dirname(__file__), "dev.db")
    CORS_ORIGINS = ["http://127.0.0.1:5500"]

    MAIL_SUPPRESS_SEND = False


class ProducaoConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    CORS_ORIGINS = [os.getenv("APP_URL")]
    MAIL_SUPPRESS_SEND = False