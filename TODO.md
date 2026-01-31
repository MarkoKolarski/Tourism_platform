# done:
- 6.
- 7.
- 8.
- 9. user must follow other user to see their blogs & add review (done with gRPC)
- 10.
- 11.
- 12. tourist can make a review for a tour (rating: 1-5, comment, user info, tour attendance date, review date)
- 13. - make the map easily edit peakpoints, always show map when editing peakpoints (in peakpoints tab):
- 15.
- 17. tour-service needs to do RPC with purchase-service to check if tour is bought


# fix (but we really don't care):
- TouristTours: fix frontend price filter to match db prices
- followers service should verify JWT token on each request
- gRPC: move out the proto code generation outside Dockerfile
    - make gen.sh scripts that build proto files to code
    - Dockerfile should just copy already generated files (not generate them)
- rename database: tourism_purchase -> tourism_purchases
