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

# TOFIX:
- fix 16. fix purchasing/reserving tour tours-service needs to communicate with purcase-service (maybe use RPC?)
    - check out: purchases-service/app/api/purchase.py:def add_to_cart
- 17. finish frontend for TourExecution (backend is done?)

# RPC
- make tours-service handle auth with stakeholders-service with RPC?
- make blogs-service handle auth with stakeholders-service with RPC?
  - currenly we get the JWT token that encodes user id, role, etc

