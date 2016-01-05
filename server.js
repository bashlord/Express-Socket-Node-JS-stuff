var express = require('express')
, app = express()
, server = require('http').createServer(app)
, io = require("socket.io").listen(server)
, npid = require("npid")
, uuid = require('node-uuid')
, Room = require('./room.js')
, bodyParser = require('body-parser')
, methodOverride = require('method-override')
, _ = require('underscore')._;

	// server = connect();
	app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 8080);
  	//app.set('ipaddr', process.env.OPENSHIFT_NODEJS_IP || "rendezvous-51012.onmodulus.net");
    app.use(bodyParser.json());                        

    // parse application/x-www-form-urlencoded
    app.use(bodyParser.urlencoded({ extended: true }));
	//app.use(express.methodOverride());
	app.use(methodOverride());

	app.use(express.static(__dirname + '/public'));
	app.use('/components', express.static(__dirname + '/components'));
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/icons', express.static(__dirname + '/icons'));
	app.set('views', __dirname + '/views');
	app.engine('html', require('ejs').renderFile);

	/* Store process-id (as priviledged user) */
	try {
	    npid.create(__dirname + '/roomID.pid', true);
	} catch (err) {
	    console.log(err);
	    //process.exit(1);
	}

app.get('/', function(req, res) {
  res.render('index.html');
});

server.listen(app.get('port'), function(){
	console.log('Express server listening on  IP: ' + ' and port ' + app.get('port'));
});

io.set("log level", 1);
var people = {};
var rooms = {};
var sockets = [];
var chatHistory = {};

function purge(s, action) {
		//The user isn't in a room, but maybe he just disconnected, handle the scenario:
		if (action === "disconnect") {
			io.sockets.emit("update", people[s.id].name + " has disconnected from the server.");
			delete people[s.id];
			sizePeople = _.size(people);
			io.sockets.emit("update-people", {people: people, count: sizePeople});
			var o = _.findWhere(sockets, {'id': s.id});
			sockets = _.without(sockets, o);

			console.log("THE PURGING MWAFNJANDQWLKDN \n but in all seriousness the server has deleted person");
		}		
	
}

io.sockets.on("connection", function (socket) {

	console.log("Something has called socket.connect() on the server with the uri");

	socket.on("joinserver", function(name, showname) {

		people[socket.id] = {
							 "name" : name,
							 "showname": showname
							};
		socket.emit("update", "You have connected to the server.");
		console.log("new user details: " + people[socket.id].name + " : " + socket.id);
		sockets.push(socket);
	});

	
	socket.on("send", function(sendto, title, detail, location, msTime) {
		var found = false;
		console.log("msg reached socket server, details following...");
		console.log("Msg sent to: " + sendto);
		console.log("title: " + title);
		console.log("detail: " + detail);
		console.log("location: " + location);
		console.log("Time: " + msTime);
		
		var whisperTo = sendto;
		var keys = Object.keys(people);
		if (keys.length != 0) {
			for (var i = 0; i<keys.length; i++) {
				console.log("number of keys of people keys-name" + keys.length);
				if (people[keys[i]].name === whisperTo) {
					var whisperId = keys[i];
					found = true;
					if (socket.id === whisperId) { //can't whisper to ourselves
						socket.emit("update", "You can't whisper to yourself.");
					}
					break;
				} 
			}
		}
		if (found && socket.id !== whisperId) {
			var whisperTo = sendto
			var title1 = title;
			var detail1 = detail;
			var location1 = location;

			var jsonObject = {
				username: people[socket.id].name,
				showname: people[socket.id].showname,
				title: title1,
				detail: detail,
				location: location1,
				time: msTime
			}

			//socket.emit("whisper", {name: "You"}, whisperMsg);
			io.to(whisperId).emit("new rendez", jsonObject);
			console.log("message transfer emitted to a direct individual, lets pray to god it was recieved.");
			console.log("God save us");
		} else {
			socket.emit("update", "Can't find " + whisperTo);
		}
	});

	socket.on("send chat", function(sendto, detail, msTime) {
		var found = false;
		console.log("chat msg reached socket server, details following...");
		console.log("Chat sent to: " + sendto);
		console.log("Chat message: " + detail);
		console.log("chat sent at: " + msTime);
		
		var whisperTo = sendto;
		var keys = Object.keys(people);
		if (keys.length != 0) {
			for (var i = 0; i<keys.length; i++) {
				console.log("number of keys of people keys-name" + keys.length);
				if (people[keys[i]].name === whisperTo) {
					var whisperId = keys[i];
					found = true;
					if (socket.id === whisperId) { //can't whisper to ourselves
						socket.emit("update", "You can't whisper to yourself.");
					}
					break;
				} 
			}
		}
		if (found && socket.id !== whisperId) {
			var whisperTo = sendto
			var detail1 = detail;
			var jsonObject = {
				username: people[socket.id].name,
				showname: people[socket.id].showname,
				detail: detail,
				time: msTime
			}


			//socket.emit("whisper", {name: "You"}, whisperMsg);
			io.to(whisperId).emit("new chat", jsonObject);
			console.log("Chatmsg emitted to a direct individual, lets pray to god it was recieved.");
			console.log("why so serious");
		} else {
			socket.emit("update", "Can't find " + whisperTo);
		}
	});

	socket.on("disconnect", function() {
		if (typeof people[socket.id] !== "undefined") { //this handles the refresh of the name screen
			purge(socket, "disconnect");
		}
	});

});