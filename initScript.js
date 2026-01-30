const { FunctionBuilder } = require("../MyLang2/dist/library/FunctionBuilder");
// const { FunctionBuilder } = require("mylang2");
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
