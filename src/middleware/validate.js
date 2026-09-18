/**
 * Zod schema validation middleware factory.
 * Usage: validate(schema)  or  validate(schema, 'query')
 */
export default function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return next(result.error); // caught by errorHandler as ZodError
    }
    req[source] = result.data; // replace with parsed/coerced data
    next();
  };
}
