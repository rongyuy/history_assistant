from fastapi import APIRouter
from app.schemas.main_schemas import ScrapeRequest, ScrapeResponse
from app.services import scraping_service

router = APIRouter()

@router.post("/scrape", response_model=ScrapeResponse)
def scrape_reference_content(request: ScrapeRequest):
    result = scraping_service.fetch_url_content(request.url)
    return result