export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Not found - ${req.originalUrl}`,
  });
};
