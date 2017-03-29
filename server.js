var http = require("http");
var fs = require("fs");
var qs = require("querystring");
var mongodb = require("mongodb");
var MongoClient = require("mongodb").MongoClient;
require("events").EventEmitter.prototype._maxListeners = 100;

var mongodbServer = new mongodb.Server("localhost", 27017, { auto_reconnect: true, poolSize: 10 });
var db = new mongodb.Db("database", mongodbServer);

var isTriedLogin = false, loginSuccessful = false, insertSuccessful = false, isRemoveItem = false, isFavExist = false;
var resetPassword = false, resetSuccessful = false;
var newPassword = "", updatedUsername = "";
var isListUpdated = false;
//var addFavourite = Successful = false;
var userExists = false, nameExists = false, emailExists = false;
var oldPwInvalid = false, samePwError = false, emptyPwError = false;
var loginUserName = "", loginUserNum = 0; // Pass user data to index page

var server = http.createServer(function(request, response) {
    if (request.method == "POST") {
		// Switch the message into JSON object
        var formData = "", msg = "", obj = "";
        return request.on("data", function(data) {
			formData += data;
			return request.on("end", function() {
				var user;
				user = qs.parse(formData);
				msg = JSON.stringify(user);
				response.writeHead(200, {
				  "Content-Type": "application/json",
				  "Content-Length": msg.length
				});
				obj = JSON.parse(msg);
				// To handle the data received from signin page
				if (request.url == "/signin.html" && obj.gender == null) {
					var username = obj.username;
					var password = obj.password;
					if (username == "" || password == "") {
						isTriedLogin = true;
					}
					else {
						// To get the data from the database
						MongoClient.connect("mongodb://localhost:27017/database", function (err, db) {
							db.collection("user", function (err, collection) {
								collection.find().toArray(function(err, items) {
									if(err) throw err;
									// To check whether there is the data in the database
									if (items != "") {
										// To check whether the user account have already existed
										for (var i=0; i<items.length; i++) {
											if (username == items[i].username && password == items[i].password) {
												loginUserName = username;
												loginUserNum = i;
												loginSuccessful = true;
												favouriteList = items[i].favourite;
												//isListUpdated = true;
												console.log("--- Login successful ---");
											}
										}
										isTriedLogin = true;
									}
								});
							});	
						});
					}
				}
				// To check whether the email address have already existed in database
				if (request.url == "/lost_pw.html") {
					resetPassword = true;
					var email = obj.email;
					var password = obj.password;
					MongoClient.connect("mongodb://localhost:27017/database", function (err, db) {
						db.collection('user', function (err, collection) {
							collection.find().toArray(function(err, items) {
								if(err) throw err;
								if (items != "") {
									// To get the belonger of a new password
									var i = 0;
									for (i = 0; i<items.length; i++) {
										if (email == items[i].email) {
											updatedUsername = items[i].username;
											break;
										}
									}
									if (i < items.length) {
										collection.update({email: email}, { $set: { password: password} }, {w:1},
											function(err, result){
												if(err) throw err;    
												resetSuccessful = true
												newPassword = password;
												console.log('--- Password updated ---');
											}
										);
									}
								}
							});
						});
					});
				}
				// To post the new user data to the database
				if (obj.gender != null) {
					var username = obj.username;
					var email = obj.email;
					MongoClient.connect("mongodb://localhost:27017/database", function (err, db) {
						db.collection("user", function (err, collection) {
							collection.find().toArray(function(err, items) {
								if(err) throw err;
								// To check whether there is data in the database
								if (items != "") {
									// To check whether the user account have already existed
									for (var i=0; i<items.length; i++) {
										if (username == items[i].username && email == items[i].email) {
											userExists = true;
										} else if (username == items[i].username) {
											nameExists = true;
										} else if (email == items[i].email) {
											emailExists = true;
										}
										if (username == items[i].username || email == items[i].email) {
											return;
										}
									}
								}
								insertUser(obj);
							});
						});	
					});
				}
				// Reset the password
				if (request.url == "/rsp.html") {
					var old_password = obj.oldPassword;
					var new_password = obj.newPassword;
					MongoClient.connect("mongodb://localhost:27017/database", function (err, db) {
						db.collection("user", function (err, collection) {
							collection.find().toArray(function(err, items) {
								if(err) throw err;
								if (old_password == "" || new_password == "") {
									emptyPwError = true;
								} else if (old_password == new_password) {
									samePwError = true;
								} else if (old_password == items[loginUserNum].password) {
									collection.update({password: old_password}, { $set: { password: new_password } }, {w:1}, function(err, result){
										if(err) throw err;
										resetSuccessful = true;
										newPassword = new_password;
										updatedUsername = loginUserName;
										console.log("--- Password updated: ---");
									});
								} else {
									oldPwInvalid = true;
								}
							});
						});	
					});
				}
				
				/*
				// Add favourite
				if (request.url == "/index.html") {
					var url = obj.url;
					
					if (url == "") {
						loginSuccessful = false;
						console.log("--- Logout successful ---");
					}
					else {
						var username = obj.username;
						MongoClient.connect("mongodb://localhost:27017/database", function (err, db) {
							db.collection("favourite", function (err, collection) {
								collection.find({username:username}, {url: url}).toArray(function(err, items) {
									if(err) throw err;
									if (items != "") {
										console.log("Record already exist");
									}
									else {
										insertFavourite(obj);
									}
								});
							});	
						});
					}					
				}
				*/
				
				// Sign out from index page
				if (request.url == "/index.html") {
					if (obj.action == "sign_out") {
						loginSuccessful = false;
						console.log("---Logout successful---");
					} else if (obj.action == "add_favourite") {
						MongoClient.connect("mongodb://localhost:27017/database", function (err,db) {
							db.collection("user", function (err, collection) {
								if (favouriteList.indexOf(obj.url) < 0) {
									// not exist
									collection.update({username: loginUserName}, { $push: { favourite: obj.url} }, {w:1}, function(err,result){
										if(err) throw err;
										isListUpdated = true;
										console.log("---The favourite list has already updated---");
									});
									collection.find().toArray(function(err, items) {
										if(err) throw err;
										favouriteList = items[loginUserNum].favourite;
										console.log("favouriteList=" + favouriteList);
									});
								}
								else {
									isFavExist = true;
									console.log("record [" + obj.url + "] alredy exist, not adding.");
								}
							});
						});
					} else if (obj.action == "remove_favourite") {
						MongoClient.connect("mongodb://localhost:27017/database", function (err,db) {
							db.collection("user", function (err,collection) {
								collection.update({username:loginUserName}, { $pull: { favourite:obj.url} }, {w:1}, function(err, result) {
									if(err) throw err;
									isListUpdated = true;
									isRemoveItem = true;
									console.log("---This favourite has already removed---");
								});
								collection.find().toArray(function(err, items) {
									if(err) throw err;
									favouriteList = items[loginUserNum].favourite;
								});
							});
						});
					}
				}
				return response.end();
			});
        });
    } else {
		// Get
		fs.readFile("./" + request.url, function (err, data) {
			var dotoffset = request.url.lastIndexOf(".");
			var mimetype = dotoffset == -1
				? "text/plain"
				: {
					".html": "text/html",
					".ico" : "image/x-icon",
					".jpg" : "image/jpeg",
					".png" : "image/png",
					".gif" : "image/gif",
					".css" : "text/css",
					".js"  : "text/javascript"
				}[request.url.substr(dotoffset)];
			if (!err) {
				response.setHeader("Content-Type", mimetype);
				response.end(data);
				console.log(request.url, mimetype);
			} else {
				response.writeHead(302, {"Location": "http://localhost:8000/index.html"});
				response.end();
			}
		});
    }
});

server.listen(8000);

console.log("Server running at http://127.0.0.1:8000/");

function insertUser(obj) {
	// Send obj data to database
	db.open(function() {
		db.collection("user", function(err, collection) {
			collection.insert({
				gender: obj.gender,
				username: obj.username,
				email: obj.email,
				password: obj.password
			}, function(err, data) {
				if (data) {
					console.log("--- Successfully insert ---");
					insertSuccessful = true;
				} else {
					console.log("--- Failed to insert ---");
				}
			});
		});
	});
}

// IO is used to send message between server an client
var io = require("socket.io").listen(server);
	
function update() {
	// Send messages to client
	if (loginSuccessful == true) {
		// Send message if signin is successful
		io.emit("login_successful", { message: "success", username: loginUserName, favouriteList: favouriteList });
	} else {
		if (isTriedLogin == true) {
			io.emit("login_failed", { message: "failure" });
			isTriedLogin = false;
		} else {
			io.emit("not_yet_login", { message: "failure" });
		}
	}
	// Send message when insert user is successful
	if (insertSuccessful == true) {
		io.emit("insert_successful", { message: "success" });
		insertSuccessful = false;
	}
	// Send message when reset password
	if (resetSuccessful == true && newPassword != "") {
		io.emit("reset_successful", { username: updatedUsername, password: newPassword });
		newPassword = "";
		updatedUsername = "";
	} else if (resetSuccessful == false && newPassword == "" && resetPassword == true) {
		io.emit("reset_failed", { message: "failure" });
		resetSuccessful = false;
		resetPassword = false;
		
	}
	
	/*
	// Send message when add favourite
	if (addFavouriteSuccessful == true) {
		io.emit("addFavourite_successful", { message: "success" });
		insertSuccessful = false;
	}
	*/
	
	// Send message when user account exists
	if (userExists == true) {
		io.emit("user_exists", { message: "failure" });
		userExists = false;
	} else if (nameExists == true) {
		io.emit("name_exists", { message: "failure" });
		nameExists = false;
	} else if (emailExists == true) {
		io.emit("email_exists", { message: "failure" });
		emailExists = false;
	}
	// Send message when failed to reset password
	if (oldPwInvalid == true) {
		io.emit("old_pw_invalid", { message: "failure" });
		oldPwInvalid = false;
	}
	if (samePwError == true) {
		io.emit("same_pw_error", { message: "failure" });
		samePwError = false;
	}
	if (emptyPwError == true) {
		io.emit("empty_pw_error", { message: "failure" });
		emptyPwError = false;
	}
	//Send the message when the favourite has alredy updated
	if (isListUpdated == true) {
		if(loginSuccessful == false && isTriedLogin == false) {
			io.emit("must_login", { message: "failure" });
		} else {
			if (isRemoveItem == false)
				io.emit("list_updated", { message: "success", favouriteList: favouriteList });
			else
				io.emit("item_removed", { message: "success", favouriteList: favouriteList });
			isRemoveItem = false;
		}
		isListUpdated = false;
	}
	
	//Send the message to user tell him the favourite already exited
	if (isFavExist == true) {
		io.emit("fav_exist", { message: "success" });
		isFavExist = false;
	}
}



/*
function insertFavourite(obj) {
	// Send obj data to database
	db.open(function() {
		db.collection("favourite", function(err, collection) {
			collection.insert({
				username: obj.username,
				url: obj.url,
				note: obj.note
			}, function(err, data) {
				if (data) {
					console.log("---Successfully insert favourite---");
					insertSuccessful = true;
				} else {
					console.log("---Failed to insert favourite---");
				}
			});
		});
	});
}
*/
	
setInterval(update, 500);