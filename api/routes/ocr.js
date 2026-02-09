const { Router } = require('express');
const multer = require('multer');
// const OpenAI = require('openai'); //Todo: switch to OpenAI in future

const router = Router();

const upload = multer({
    storage: multer.memoryStorage()
});

// const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }); //Todo: switch to OpenAI in future

router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        const mime = req.file.mimetype || '';

        if (!mime.startsWith('image/')) {
            return res.status(400).json({ error: 'File must be an image' });
        }

        //Todo: switch to OpenAI in future

        // const base64 = req.file.buffer.toString('base64');
        // const dataUrl = `data:${mime};base64,${base64}`;
        // const response = await client.responses.create({
        //     model: "gpt-4.1-mini",
        //     input: [{
        //         role: "user",
        //         content: [
        //             {
        //                 type: "input_text",
        //                 text: "Extract the tracklist text from this image. Output only the text, one line per track."
        //             },
        //             {
        //                 type: "input_image",
        //                 image_url: dataUrl,
        //             },
        //         ],
        //     }],
        // });
        //
        // const text = response;

        return res.json({
            success: true,
            response
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
