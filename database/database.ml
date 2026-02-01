import "fs";
import "path";
import "json";
import "arrays";
import "crypto";
import "os";
import "coreio";

struct DB {
  var path;
  
  func get(key) {
    this.existingDBFile();
      
    var jsonWrite = fs.readFile(this.path).toString();
    var jsonValue = json.parse(jsonWrite);
    
    if (key in jsonValue) {
      return jsonValue[key];
    }
    
    return nil;
  }
  
  func set(key, value) {
    this.existingDBFile();
      
    var jsonWrite = fs.readFile(this.path).toString();
    var jsonValue = json.parse(jsonWrite);
    
    jsonValue[key] = value;
    
    fs.writeFile(this.path, json.stringify(jsonValue))
    
    return jsonValue;
  }
  
  func has(key) {
    this.existingDBFile();
      
    var jsonWrite = fs.readFile(this.path).toString();
    var jsonValue = json.parse(jsonWrite);
    
    return key in jsonValue;
  }
  
  func all() {
    this.existingDBFile();
    
    var jsonWrite = fs.readFile(this.path).toString();
    return json.parse(jsonWrite);
  }
  
  func find(cb) {
    this.existingDBFile();
    
    var jsonWrite = fs.readFile(this.path).toString();
    var value = json.parse(jsonWrite);

    for (var key in value) {
       if (cb(value[key])) {
         return value[key];
       }
    }
  }
  
  func existingDBFile() {
    try {
      fs.stat(this.path);
    } catch {
      fs.writeFile(this.path, "{}");
    }
  }
}

var users = DB(path.join(import.base, "users.json"));
var songs = DB(path.join(import.base, "songs.json"));

export ( users, songs );
