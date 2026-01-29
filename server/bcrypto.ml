import "crypto";
import "strings";

func hashPassword(password) {
  var salt = crypto.randomBytes(16, "hex");
  var hash = crypto.pbkdf2(password, salt, 10000, 64, "sha512");
  return $"{salt}:{hash}";
}

func comparePassword(password, stored) {
  var salt = strings.split(stored, ":")[0];
  var originalHash = strings.split(stored, ":")[1];
  var hash = crypto.pbkdf2(password, salt, 10000, 64, "sha512");
  return hash == originalHash;
}

export ( hashPassword, comparePassword );
