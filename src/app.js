require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const redisClient = require("./redis");
const cacheMiddleware = require("./redis.middleware");
const fakeData = require("./fakeData/data");
const app = express();
const PORT = process.env.PORT ?? 3000;

// Política de caché y simulación, configurables vía .env (con valor por defecto)
const CACHE_TTL_SEGUNDOS = Number(process.env.CACHE_TTL_SEGUNDOS ?? 60);
const DEMORA_QUERY_MS = Number(process.env.DEMORA_QUERY_MS ?? 2000);

app.use(morgan("tiny"));
app.use(express.json());

app.get("/:id", cacheMiddleware.checkCache, async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = await queryQueTarda(id);
    // prime cache: guardamos el resultado con TTL para los próximos pedidos
    await redisClient.set(id, JSON.stringify(data), { EX: CACHE_TTL_SEGUNDOS });
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
});

app.delete("/:id", cacheMiddleware.deleteCache, async (req, res) => {
  res.status(204).json();
});

// Simula una consulta lenta a una BD/servicio externo (el caso de cache miss)
const queryQueTarda = (id) => {
  return new Promise((resolve) => setTimeout(resolve, DEMORA_QUERY_MS)).then(
    () => fakeData(id)
  );
};

// Manejador de errores centralizado: cualquier next(err) termina acá
app.use((err, req, res, next) => {
  console.error("Error en la request:", err);
  res.status(500).json({ error: "Error interno del servidor" });
});

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`\u{1F680} Aplicacion iniciada en: http://localhost:${PORT}`);
  await redisClient.connect();
});
