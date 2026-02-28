const form = document.getElementById('video-intake-form');
const aRollInput = document.getElementById('aRoll');
const voiceInput = document.getElementById('voiceOver');
const aRollList = document.getElementById('aRollList');
const voiceOverList = document.getElementById('voiceOverList');
const output = document.getElementById('output');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');

const renderFileList = (files, target) => {
  target.innerHTML = '';
  if (!files.length) {
    const li = document.createElement('li');
    li.textContent = 'No files selected.';
    target.appendChild(li);
    return;
  }

  files.forEach((file) => {
    const li = document.createElement('li');
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    li.textContent = `${file.name} (${sizeMb} MB)`;
    target.appendChild(li);
  });
};

const writePayload = (payload) => {
  output.textContent = JSON.stringify(payload, null, 2);
};

const submitBrief = async () => {
  const payload = new FormData(form);
  output.textContent = 'Saving brief and uploaded media...';

  const response = await fetch('/api/submit', {
    method: 'POST',
    body: payload,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Submission failed.');
  }

  writePayload(data);
};

aRollInput.addEventListener('change', () => {
  renderFileList(Array.from(aRollInput.files || []), aRollList);
});

voiceInput.addEventListener('change', () => {
  renderFileList(Array.from(voiceInput.files || []), voiceOverList);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    await submitBrief();
  } catch (error) {
    writePayload({ ok: false, error: error.message });
  }
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(output.textContent || '');
    copyBtn.textContent = 'Copied';
    setTimeout(() => {
      copyBtn.textContent = 'Copy JSON';
    }, 1200);
  } catch {
    copyBtn.textContent = 'Copy failed';
  }
});

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([output.textContent || ''], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'video-brief-response.json';
  anchor.click();
  URL.revokeObjectURL(url);
});

renderFileList([], aRollList);
renderFileList([], voiceOverList);
