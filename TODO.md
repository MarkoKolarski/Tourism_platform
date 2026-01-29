# done:
- 6.
- 7.
- 8.
- 10.
- 11.
- 15.

# TOFIX:
- fix 9. user must follow other user to see their blogs & add review
- fix 16. fix purchasing/reserving tour tour-service needs to communicate with purcase-service (maybe use RPC?)
    - check out: purchase-service/app/api/purchase.py:def add_to_cart

# TODO:
- 13. 
    - frontend:
        - select keypoints on map
        - edit keypoints on map
        - delete keypoints on map
        - delete travel_time

- 12. tourist can make a review for a tour (rating: 1-5, comment, user info, tour attendance date, review date)
- 17. finish frontend for TourExecution (backend is done?)

# RPC
- make tour-service handle auth with stakeholder-service with RPC
- make blog-service handle auth with stakeholder-service with RPC
  - currenly we get the JWT token that encodes user id, role, etc

