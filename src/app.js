require("dotenv").config();
const express = require("express");
const redisClient = require("./redis");
const cacheMiddleware = require("./redis.middleware");
const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

app.get("/:id", cacheMiddleware.checkCache, async (req, res) => {
  const id = req.params.id;
  const data = await queryQueTarda(id);
  redisClient.set(id, JSON.stringify(data), { EX: 60 });
  res.status(200).json(data);
});

app.delete("/:id", cacheMiddleware.deleteCache, async (req, res) => {
  res.status(204).json();
});

const queryQueTarda = (id) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        userId: id,
        first_name: "Gerardo",
        last_name: "Gonzalez",
        address: {
          street: "140 RioBamba",
          zip_code: 223,
          city: "Buenos Aires",
          country: "Arg",
        },
      });
    }, 2500);
  });
};

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`\u{1F680} Aplicacion iniciada en: http://localhost:${PORT}`);
  await redisClient.connect();
});
