from scrapers.playwright_scrapers import scrape_store

def scrape(category, keyword):
    return scrape_store("La Barra", category, keyword)
