const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const MAX_SIZE = 2 * 1024 * 1024; // 2 МБ
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function handleAvatarUpload(fileData) {
  try {
    const [meta, base64Data] = fileData.split(",");
    const mimeMatch = meta.match(/data:(.*);base64/);

    if (!mimeMatch) {
      return {
        ok: false,
        error: `Тип файла должен быть: ${ALLOWED_MIME.split(", ")}`,
      };
    }

    const mimeType = mimeMatch[1];

    if (!ALLOWED_MIME.includes(mimeType)) {
      return {
        ok: false,
        error: `Тип файла должен быть: ${ALLOWED_MIME.split(", ")}`,
      };
    }

    const buffer = Buffer.from(base64Data, "base64");

    if (buffer.length > MAX_SIZE) {
      return { ok: false, error: `Файл не должен быть больше 2MB` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

module.exports = { handleAvatarUpload };
