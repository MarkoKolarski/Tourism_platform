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

# TODO:
- fix 16. fix purchasing/reserving
    - tours-service needs to communicate with purcase-service (maybe use RPC?)
        - fetch tour info / check if tour exists
    - need to fix buttons on frontend (purchase)
    - check out: purchases-service/app/api/purchase.py:def add_to_cart
- 17. tour-service needs to do RPC with purchase-service to check if tour is bought
    - tourist can only start tours they bought


# mini fixes
- make tour name clickable navigate to tour
- review: use current date for default datetime
- center tour map to see all peakpoints
