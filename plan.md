1. Connect with our APIs
    -Data For SEO
    -Google Maps API
2. Index all pages + services
    Service = This
    Location = This
    Intended URL = This
2. Diagram what we want the produce to do
    - Create functions that:
        Per service/location
        Inputs:
            Geo Coordinate
            Search Term Array ["search term 1", "Search term 2"]
            Intended Ranking Page
        Process
            Loop{Query Data for SEO API to get results per page/term}
            Analyze:
                Ranking Pages Number: Int - number of our aaacwildliferemoval.com domains in the SERPs
                What Ranks: URL(s)
                Where Does it Rank: Int
                [{"page":"url.com","rank":3},{"page":"url.com","rank":3}]
            Swith Statement
                If Ranking URL Matches Intended Ranking Page: Page Match = TRUE
                If Ranking URL Matches Location = Location Match
                If Ranking URL matches Service = Service Match
                If Ranking URL matches Subdomain = Office Match
                If Ranking URL matches the Domain Only = Domain Match


