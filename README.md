# LoveLetter IO

Browser-based implementation of the popular Loveletter card game.
Created with jquery, node, socket.io and express.

Simply download the project and use ```npm install```.To start the server use ```npm run start``` or with nodemon ```npm run start-dev```. The server runs at port 1234.
In the browser just enter a name, create a room or join a friend's room and start playing right away. No account needed.

I did not use the original card art for obvious copyright reasons.

## TODO:
* Break up code into different files for more maintainability and readability
* Add room password support
* Add socket namespaces (currently I use different rooms in the same namespace)
* Refactor CSS and html (It works fine but it is really messy)
