from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=["../.env", ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_url: str = "http://localhost:3000"
    # Comma-separated list of additional CORS origins (e.g. Vercel preview URLs)
    cors_origins: str = ""
    api_url: str = "http://localhost:8000"

    database_url: str

    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_storage_bucket: str = "invoices"

    redis_url: str = "redis://localhost:6379/0"

    google_cloud_project_id: str = ""
    google_application_credentials: str = ""

    ai_provider: str = "openai"
    openai_api_key: str = ""
    ai_model: str = "gpt-4.1-mini"

    # KSEF_ENV: dry_run | sandbox | production
    # sandbox default URL: https://api-test.ksef.mf.gov.pl/v2
    # production URL:      https://api.ksef.mf.gov.pl/v2
    # KSEF_API_URL overrides the default for the chosen env (optional)
    ksef_env: str = "dry_run"
    ksef_api_url: str = ""
    ksef_client_id: str = ""
    ksef_client_secret: str = ""
    ksef_public_key_pem: str = ""

    jwt_secret: str


settings = Settings()
