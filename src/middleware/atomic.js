import mongoose from 'mongoose';

// All queries made during a financial operation share its MongoDB transaction.
mongoose.set('transactionAsyncLocalStorage', true);
export default function atomic(handler) {
  return async (req, res) => {
    let body;
    let status = 200;
    const response = {
      status(code) { status = code; return this; },
      json(value) { body = value; return this; },
    };
    await mongoose.connection.transaction(async () => {
      await handler(req, response);
      if (status >= 400) throw Object.assign(new Error(body.error), { statusCode: status });
    });
    res.status(status).json(body);
  };
}
