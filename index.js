const express = require("express");
const multer = require("multer");
const AdmZip = require("adm-zip");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ storage: multer.memoryStorage() });

app.post("/upload", upload.array("files"), async (req, res) => {
  try {
    const { nome_arquivo } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "Nenhum arquivo enviado." });
    }

    // Cria o ZIP
    const zip = new AdmZip();
    files.forEach((file) => {
      zip.addFile(file.originalname, file.buffer);
    });

    const zipBuffer = zip.toBuffer();

    // Upload para Cloudflare R2
    const formData = new FormData();
    formData.append("file", zipBuffer, {
      filename: `${nome_arquivo}.zip`,
      contentType: "application/zip",
    });
    formData.append("upload_preset", "appsmith_upload");

    const response = await fetch("https://api.cloudinary.com/v1_1/dndycbroy/raw/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.secure_url) {
      return res.json({ zip_url: result.secure_url });
    } else {
      return res.status(500).json({ error: result });
    }
  } catch (err) {
    console.error("Erro no upload:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log("Servidor rodando na porta", port);
});