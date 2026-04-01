# EchoShare
A community based web app designed for individuals to post, organize, contact and work to tackle the problem of pollution near water bodies.<br>

**Problem Statement**: Create a technology driven solution to tackle pollution, biodiversity loss, and resource overuse in marine ecosystem.

----

# Idea
Create a community based social networking like web app designed for individuals to post, organize and work to tackle the problem of pollution near water bodies(beaches, ponds etc).<br>

----

# Requirements

1. Community driven app - Individuals post geotagged photos of litter around water bodies. <br>
2. The intensity of litter around a given water body is shown using heatmap on a google map. <br>
3. Users can login with Google SSO or Apple SSO for best authentication. <br>
4. Users can find information about NGOs, Government organizations and individuals who can work for the cause. <br>
5. Users can put any generic post organizing a group effort on a specific water body.<br>

----

# Flow
1. User logs into the service with their google or apple account.<br>
2. User tries to post images of litter around the source of their choice.<br>
3. Evalution of the image to check if it actually is related to litter around a source or just some random image.<br>
4. Rate limiting to avoid spam posts.<br>
5. Image is posted successfully with some information like litter type, geolocation and severity given by the user.<br>
6. Backend updates the map with updated heatmap according to user posts.<br>
7. The user can then further look for NGOs, Government Orgs and individuals around them within a separate section in the website.<br>
----

# Webpage
1. Once the user is authenticated, they are shown their homepage.<br>
2. A users homepage has the following:<br>
    i. Left end.<br>
        a. Has information on the NGOs, Government organizations in the location of their choice.<br>
        b. When hovered, they show information about the organization.(a hyperlink to the orgs website).<br>
        c. On toggling the right end moves away only showing the contents in the middle and the right half.<br>
    ii. Middle part.<br>
        a. Their post history in the middle.<br>
        b. This section is dynamically loaded based on the post information for every user in the database.<br>
        c. Every post contains username, content of the post, text following the post, date and time of the post and reactions to the post.<br>
    iii. Right end.<br>
        a. Contains the heatmap.<br>
        b. Heatmap represents the litter density based on frequency of appearance in the post.<br>
        c. The heatmap updates automatically when a user posts.<br>
        d. The heat is calculated based on a formula based on parameters in the backend.<br>
    iv. Top right corner.<br>
        a. Profile icon.<br>
        b. Allow the users to view their username and other credentials.<br>
        c. A section to view all the upcoming events they have enlisted to volunteer for.<br>

----

# Tech Stack

Frontend:
    1.
    2.
    3.

Backend:
    1.
    2.
    3.

Authentication:
    1.
    2.

Database:
    1.
    2.


-----

Repository for BGS 24 Hour Hackathon.<br>
