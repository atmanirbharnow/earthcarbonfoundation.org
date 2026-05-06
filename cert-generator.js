// cert-generator.js
// Earth Carbon Foundation — Certificate Generator
// Web App API: https://script.google.com/macros/s/AKfycbytZy_MIX41q4ksjbhAramnfX8TrFb3N7ADYiAoSrh3boM1sMWX3jEFcYJvHNUWTj4/exec

const API_URL = "https://script.google.com/macros/s/AKfycbytZy_MIX41q4ksjbhAramnfX8TrFb3N7ADYiAoSrh3boM1sMWX3jEFcYJvHNUWTj4/exec";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const certId = params.get("certId");
  
  if (!certId) {
    showError("No Certificate ID found in URL. Please submit the assessment first.");
    return;
  }

  // Show loading state
  document.getElementById("cert-loader").style.display = "flex";
  document.getElementById("cert-container").style.display = "none";
  document.getElementById("cert-actions").style.display = "none";
  document.getElementById("cert-error").style.display = "none";

  // Fetch certificate data from Google Apps Script Web App
  fetch(`${API_URL}?certId=${encodeURIComponent(certId)}`)
    .then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then(resp => {
      if (resp.status === "success") {
        renderCertificate(resp.data);
      } else {
        showError(resp.message || "Certificate not found or pending validation.");
      }
    })
    .catch(err => {
      console.error("Certificate fetch error:", err);
      showError("Failed to load certificate. Please check your connection or try again later.");
    });
});

function renderCertificate(data) {
  // Populate certificate fields
  document.getElementById("cert-name").textContent = data.name || "Earth Carbon Participant";
  document.getElementById("cert-tco2e").textContent = `${data.tCO2e || "0"} tCO₂e`;
  document.getElementById("cert-atmanirbhar").textContent = `${data.atmanirbhar || "0"}%`;
  document.getElementById("cert-sdg").textContent = data.sdg || "SDG 7, SDG 13";
  document.getElementById("cert-revenue").textContent = `₹${Number(data.revenue || 0).toLocaleString("en-IN")}`;
  document.getElementById("cert-date").textContent = data.date || new Date().toLocaleDateString("en-IN");
  document.getElementById("cert-id").textContent = data.certId || "ECF-XXXXXX";
  
  // Display truncated hash for verification
  const hash = data.hash || "";
  document.getElementById("cert-hash").textContent = hash.length > 16 ? hash.substring(0, 16) + "..." : hash;

  // Generate QR Code pointing to verification page
  const verifyUrl = `${window.location.origin}/verify.html?certId=${data.certId}`;
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;
  const qrImg = document.getElementById("cert-qr");
  if (qrImg) {
    qrImg.src = qrApiUrl;
    qrImg.alt = `Verify Certificate ${data.certId}`;
  }

  // Hide loader, show certificate + actions
  document.getElementById("cert-loader").style.display = "none";
  document.getElementById("cert-container").style.display = "block";
  document.getElementById("cert-actions").style.display = "flex";
  
  // Update page title for social sharing
  document.title = `Certificate: ${data.name} | Earth Carbon Foundation`;
  
  console.log("✅ Certificate rendered:", data.certId);
}

function showError(msg) {
  document.getElementById("cert-loader").style.display = "none";
  const err = document.getElementById("cert-error");
  if (err) {
    err.textContent = msg;
    err.style.display = "block";
  }
  console.warn("❌ Certificate error:", msg);
}

// Download Certificate as PDF
document.getElementById("download-pdf")?.addEventListener("click", async () => {
  const btn = document.getElementById("download-pdf");
  const originalText = btn.innerHTML;
  btn.innerHTML = "⏳ Generating...";
  btn.disabled = true;

  try {
    // Wait for fonts/images to load
    await document.fonts.ready;
    
    const certEl = document.getElementById("cert-container");
    if (!certEl) throw new Error("Certificate element not found");

    // Render to canvas with high DPI
    const canvas = await html2canvas(certEl, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false
    });
    
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    
    // A4 landscape dimensions in mm
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    // Center image vertically if shorter than page
    const yPosition = (pdfHeight - imgHeight) / 2;
    
    pdf.addImage(imgData, "PNG", 0, yPosition > 0 ? yPosition : 0, pdfWidth, imgHeight);
    
    // Add subtle footer with verification info
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    const certId = document.getElementById("cert-id")?.textContent || "";
    pdf.text(`Verify: ${window.location.origin}/verify.html?certId=${certId}`, 10, pdfHeight - 5);
    
    // Save with descriptive filename
    const safeName = (document.getElementById("cert-name")?.textContent || "Certificate").replace(/[^a-z0-9]/gi, "_").substring(0, 30);
    pdf.save(`${safeName}_${certId}_EarthCarbon_Certificate.pdf`);
    
    console.log("✅ PDF downloaded");
  } catch (e) {
    console.error("PDF generation failed:", e);
    alert("PDF generation failed. Try taking a screenshot instead, or check your browser permissions.");
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
});

// Share Certificate via Web Share API or fallback
document.getElementById("share-cert")?.addEventListener("click", async () => {
  const name = document.getElementById("cert-name")?.textContent || "Participant";
  const atmanirbhar = document.getElementById("cert-atmanirbhar")?.textContent || "0%";
  const tco2e = document.getElementById("cert-tco2e")?.textContent || "0 tCO₂e";
  
  const shareData = {
    title: `🌱 My Earth Carbon Certificate`,
    text: `I just earned my Earth Carbon Certificate! 🎉\n\n👤 ${name}\n🇮🇳 Atmanirbhar Score: ${atmanirbhar}\n🌍 Carbon Reduced: ${tco2e}\n\nVerify: ${window.location.href}`,
    url: window.location.href
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      console.log("✅ Shared via Web Share API");
    } else {
      // Fallback: copy link + show toast
      await navigator.clipboard.writeText(window.location.href);
      showToast("🔗 Link copied! Paste anywhere to share.");
      console.log("✅ Link copied to clipboard");
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      console.warn("Share failed:", err);
      await navigator.clipboard.writeText(window.location.href);
      showToast("🔗 Link copied! Share manually.");
    }
  }
});

// Simple toast notification for share feedback
function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background: #0d631b;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    animation: slideUp 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
  `;
  
  // Add animation keyframes if not present
  if (!document.getElementById("toast-styles")) {
    const style = document.createElement("style");
    style.id = "toast-styles";
    style.textContent = `
      @keyframes slideUp { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
      @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Preload critical libraries (defensive)
(function preloadLibs() {
  const libs = [
    { name: "html2canvas", global: "html2canvas", url: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" },
    { name: "jspdf", global: "jspdf", url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" }
  ];
  
  libs.forEach(lib => {
    if (typeof window[lib.global] === "undefined") {
      console.warn(`⚠️ ${lib.name} not loaded. PDF download may fail.`);
    }
  });
})();
