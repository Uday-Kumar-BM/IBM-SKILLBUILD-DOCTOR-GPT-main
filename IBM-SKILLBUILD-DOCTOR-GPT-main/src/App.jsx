import { useState, useRef, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

/* ================= GEMINI SETUP (FRONTEND ONLY) ================= */

// ⚠️ Demo / prototype only
const genAI = new GoogleGenerativeAI(
  import.meta.env.VITE_GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash-lite",
});

// Convert image file → base64
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

/* ================= APP ================= */

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* ================= GEMINI CALL ================= */

  const submitToAI = async ({ text, images }) => {
    const parts = [];

    // CLEAN, PROFESSIONAL SYSTEM PROMPT
    parts.push({
      text: `
You are DoctorGPT, a helpful medical assistant.

Your responsibilities:
- Explain medical information in simple, clear language
- Be calm, supportive, and professional
- You may give general medical guidance and explanations
- Do NOT claim to replace a licensed doctor

If the user provides ONLY text:
- Answer health questions clearly
- Give general advice and possible causes
- Encourage consulting a doctor when appropriate

If the user provides a prescription image:
- Identify medicine names if visible
- Explain what each medicine is commonly used for
- Mention dosage ONLY if clearly readable
- Mention common side effects briefly
- Do NOT guess unclear information

Always end with a short disclaimer:
"This is for informational purposes only and not a medical diagnosis."

User message:
${text || "Prescription uploaded"}
`,
    });

    // Image part (optional)
    if (images.length > 0) {
      const base64 = await fileToBase64(images[0]);
      parts.push({
        inlineData: {
          data: base64,
          mimeType: images[0].type,
        },
      });
    }

    const result = await model.generateContent(parts);
    return result.response.text();
  };

  /* ================= SEND MESSAGE ================= */

  const send = async () => {
    if (!input.trim() && images.length === 0) return;

    const userMessage = {
      role: "user",
      text: input,
      images,
    };

    setMessages((m) => [...m, userMessage]);
    setInput("");
    setImages([]);
    setLoading(true);

    try {
      const reply = await submitToAI({
        text: userMessage.text,
        images: userMessage.images,
      });

      setMessages((m) => [...m, { role: "bot", text: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "bot", text: "❌ Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= IMAGE HANDLER ================= */

  const handleImages = (e) => {
    const valid = [...e.target.files].filter(
      (f) => f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024
    );
    setImages(valid);
    fileRef.current.value = "";
  };

  /* ================= UI ================= */

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-200">
      {/* CENTER COLUMN */}
      <div className="max-w-3xl mx-auto flex flex-col min-h-screen">

        {/* HEADER */}
        <header className="h-14 flex items-center justify-center border-b border-[#2a2a2a] text-sm font-semibold">
          DoctorGPT
        </header>

        {/* CHAT */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages.map((m, i) => (
            <div key={i}>
              <div className="text-xs text-gray-500 mb-1">
                {m.role === "user" ? "You" : "DoctorGPT"}
              </div>

              <div
                className={`rounded-xl px-4 py-3 text-sm leading-relaxed
                ${m.role === "user"
                  ? "bg-[#1f1f1f]"
                  : "bg-[#161616]"}`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {m.images?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {m.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(img)}
                        className="w-28 h-28 rounded-lg object-cover"
                        alt="uploaded"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-sm text-gray-500">
              DoctorGPT is analyzing…
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        {/* INPUT */}
        <footer className="border-t border-[#2a2a2a] px-4 py-4">
          {images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={URL.createObjectURL(img)}
                  className="w-16 h-16 rounded-md object-cover"
                  alt="preview"
                />
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 bg-[#161616] rounded-xl px-3 py-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleImages}
            />

            <button
              onClick={() => fileRef.current.click()}
              className="text-gray-400 hover:text-white"
            >
              📎
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a health question or upload a prescription…"
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />

            <button
              onClick={send}
              disabled={loading}
              className="text-sm text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>

          <p className="text-[11px] text-gray-500 text-center mt-2">
            This assistant provides information only and does not replace a medical professional.
          </p>
        </footer>
      </div>
    </div>
  );
}
