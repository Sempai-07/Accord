const { FunctionBuilder } = require("mylang");
const { handleAvatarUpload } = require("./utils/uploadAvatar");

module.exports = {
  init: {
    handleAvatarUpload: class extends FunctionBuilder {
      call() {
        return handleAvatarUpload(...this.args);
      }
    },
  },
};
