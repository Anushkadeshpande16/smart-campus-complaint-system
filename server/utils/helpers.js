class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const str = (v) => (typeof v === 'string' ? v.trim() : v == null ? '' : String(v).trim());
const has = (v) => v !== undefined && v !== null && String(v).trim() !== '';
const bad = (msg) => { throw new HttpError(400, msg); };
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

module.exports = { HttpError, asyncHandler, str, has, bad, isEmail };
