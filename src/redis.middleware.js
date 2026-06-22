const client = require("./redis");

const checkCache = async (req, res, next) => {
  try {
    const id = req.params.id ?? -1;
    const data = await client.get(id);
    if (data) {
      // cache hit: respondemos sin ejecutar el handler de la ruta
      return res.status(200).json(JSON.parse(data));
    }
    next();
  } catch (err) {
    next(err);
  }
};

const deleteCache = async (req, res, next) => {
  try {
    const id = req.params.id ?? -1;
    await client.del(id);
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { checkCache, deleteCache };
