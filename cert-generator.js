// cert-generator.js
const API_URL = "YOUR_APPS_SCRIPT_WEB_APP_URL_HERE"; // PASTE YOUR DEPLOYED URL

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const certId = params.get("certId");
  if (!certId) {
    showError("No Certificate ID found in URL. Please submit the assessment first.");
    return;
  }

  fetch(`${API_URL}?certId=${certId}`)
    .then(res => res.json())
    .then(resp => {
      if (resp.status === "success") renderCertificate(resp.data);
      else showError(resp.message);
    })
    .catch(() => showError("Failed to load certificate. Check your connection."));
});

function renderCertificate(data) {
  document.getElementById("cert-name").textContent = data.name;
  document.getElementById("cert-tco2e").textContent = `${data.tCO2e} tCO₂e`;
  document.getElementById("cert-atmanirbhar").textContent = `${data.atmanirbhar}%`;
  document.getElementById("cert-sdg").textContent = data.sdg;
  document.getElementById("cert-revenue").textContent = `${Number(data.revenue).toLocaleString("en-IN")}`;
  document.getElementById("cert-date").textContent = data.date;
  document.getElementById("cert-id").textContent = data.certId;
  document.getElementById("cert-hash").textContent = data.hash.substring(0, 16) + "...";

  // QR Code (lightweight API)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(window.location.href)}`;
  document.getElementById("cert-qr").src = qrUrl;

  document.getElementById("cert-loader").style.display = "none";
  document.getElementById("cert-container").style.display = "block";
  document.getElementById("cert-actions").style.display = "flex";
}

function showError(msg) {
  document.getElementById("cert-loader").style.display = "none";
  const err = document.getElementById("cert-error");
  err.textContent = msg;
  err.style.display = "block";
}

// Download PDF
document.getElementById("download-pdf")?.addEventListener("click", async () => {
  const btn = document.getElementById("download-pdf");
  btn.textContent = " Generating...";
  try {
    const canvas = await html2canvas(document.getElementById("cert-container"), { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${document.getElementById("cert-id").textContent}_Certificate.pdf`);
  } catch (e) {
    alert("PDF generation failed. Try screenshot instead.");
  }
  btn.textContent = "📄 Download PDF";
});

// Share Certificate
document.getElementById("share-cert")?.addEventListener("click", async () => {
  const shareData = {
    title: "My Earth Carbon Certificate",
    text: `I achieved ${document.getElementById("cert-atmanirbhar").textContent} Atmanirbhar Score & ${document.getElementById("cert-tco2e").textContent} reduction!`,
    url: window.location.href
  };
  if (navigator.share) {
    try { await navigator.share(shareData); } catch {}
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert("Link copied to clipboard! Share it anywhere.");
  }
});
