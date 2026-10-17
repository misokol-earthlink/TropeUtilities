// Audio Time Slice utility. Extracted from AudioTimeSlicer.html.
(() => {
  "use strict";
  let initialized = false;
  window.AudioTimeSlice = {
    start() {
      document.getElementById("mergePanel")?.classList.remove("visible");
      const panel = document.getElementById("audioTimeSlicePanel");
      if (!panel) return;
      panel.classList.add("visible");
      if (initialized) return;
      initialized = true;
      initializeAudioTimeSlice();
    }
  };
  function initializeAudioTimeSlice() {
"use strict";

const initialData = {
  reading: "Rosh Hashanah Day 2",
  audioUrl: "https://images.shulcloud.com/13447/299814.mp3",
  aliyot: [
    {
      name: "Aliyah 1 — Genesis 22:1–3",
      segments: [
        { verse: "Genesis 22:1", start: 14.80, end: 33.00 },
        { verse: "Genesis 22:2", start: 34.20, end: 69.10 },
        { verse: "Genesis 22:3", start: 71.50, end: null }
      ]
    }
  ]
};

const audio = document.getElementById("ats-audio");
const audioUrl = document.getElementById("ats-audioUrl");
const localMp3 = document.getElementById("ats-localMp3");
let localAudioFile = null;
let localObjectUrl = null;
let remoteAudioUrl = document.getElementById("ats-audioUrl").value.trim();
const aliyahsEl = document.getElementById("ats-aliyahs");
const statusEl = document.getElementById("ats-status");
const clockEl = document.getElementById("ats-clock");
const jsonOutput = document.getElementById("ats-jsonOutput");
const outputFormat = document.getElementById("ats-outputFormat");
let decodedAudio = null;
let decodedUrl = null;
let hhCatalog = null;
let selectedHHKey = "";
let selectedHHIndex = -1;
const hhFile = document.getElementById("ats-hhFile");
const hhReading = document.getElementById("ats-hhReading");
const hhAliyah = document.getElementById("ats-hhAliyah");
const readingId = document.getElementById("ats-readingId");
const fileSuffix = document.getElementById("ats-fileSuffix");
const exportStartLine = document.getElementById("ats-exportStartLine");
const suggestedIds = {rh2:"CBS_RH2",rh1Shabbat:"CBS_RH1",rh1Weekday:"CBS_RH1",ykShabbat:"CBS_YK1",ykWeekday:"CBS_YK1"};

function catalogEntries(parsed) {
  // Current source format: {source, readings:[{id,name,aliyot:[{num,reference,tracks:[...]}]}]}
  if (Array.isArray(parsed.readings)) {
    return parsed.readings.filter(r => r && Array.isArray(r.aliyot))
      .map((r,i) => [r.id || String(i), r]);
  }
  // Legacy HH2 format: {rh2:{name,aliyot:[{segments:[...]}]}, ...}
  return Object.entries(parsed).filter(([key,r]) => r && Array.isArray(r.aliyot));
}

function getTracks(aliyah) {
  if (Array.isArray(aliyah.tracks)) return aliyah.tracks;
  if (Array.isArray(aliyah.segments)) return aliyah.segments;
  return [];
}

function updateAliyahOptions() {
  selectedHHKey = hhReading.value;
  const reading = hhCatalog?.[selectedHHKey];
  if (!reading) return;
  hhAliyah.replaceChildren();
  reading.aliyot.forEach((a,i)=>{
    // Full is a synthetic aggregation of multiple recordings, not a single MP3 aliyah.
    if (String(a.num).toLowerCase() === "full") return;
    const option=document.createElement("option");
    option.value=String(i);
    option.textContent="Aliyah " + (a.num ?? i+1) + " — " + (a.reference || "");
    hhAliyah.appendChild(option);
  });
  hhAliyah.disabled = hhAliyah.options.length === 0;
  readingId.value=suggestedIds[selectedHHKey] || (hhCatalogSource ? hhCatalogSource+"_"+selectedHHKey : selectedHHKey);
  if (!hhAliyah.disabled) selectHHAliyah();
  else status("No individual aliyot found in this reading.");
}

let hhCatalogSource = "";
function selectHHAliyah() {
  const reading=hhCatalog?.[selectedHHKey];
  if (!reading) return;
  const index=Number(hhAliyah.value);
  const a=reading.aliyot[index];
  if (!a) return;
  const tracks=getTracks(a);
  if (!tracks.length) { status("Selected aliyah has no tracks."); return; }
  const urls=[...new Set(tracks.map(t=>t.audioUrl || a.audioUrl || "").filter(Boolean))];
  if (urls.length > 1) {
    status("This aliyah references multiple MP3s. Select an individual aliyah with one MP3.");
    return;
  }
  stopAudio();
  selectedHHIndex=index;
  initialData.reading=reading.name || selectedHHKey;
  initialData.aliyot=[{
    name:"Aliyah " + (a.num ?? index+1) + " — " + (a.reference || ""),
    segments:tracks.map((track,i)=>({
      verse:track.ref || track.verse || "",
      start:track.start ?? 0,
      end:track.end ?? null,
      lineNumber:Number.isSafeInteger(Number(track.lineNumber)) ? Number(track.lineNumber) : i+1
    }))
  }];
  remoteAudioUrl=urls[0] || "";
  audioUrl.value=remoteAudioUrl;
  clearLocalFile();
  // The original line numbers can be non-consecutive across readings. Export uses
  // the chosen starting line number to make a self-contained sequential extract.
  render(); refreshJson();
  if (remoteAudioUrl) loadAudio();
  else status("Aliyah imported. Select a local MP3 or enter an MP3 URL.");
}

hhFile.addEventListener("change",async()=>{
  const file=hhFile.files?.[0];if(!file)return;
  try {
    const parsed=JSON.parse(await file.text());
    // Standalone timing document produced by this editor.
    if (Array.isArray(parsed.aliyot)) {
      if (!parsed.aliyot.every(a => a && Array.isArray(a.segments)))
        throw new Error("Invalid timing document: an aliyah has no segments array.");
      stopAudio();
      hhCatalog=null; hhCatalogSource="";
      selectedHHKey=""; selectedHHIndex=-1;
      hhReading.replaceChildren(new Option("Standalone timing document"));
      hhReading.disabled=true;
      hhAliyah.replaceChildren(new Option("All imported aliyot"));
      hhAliyah.disabled=true;
      initialData.reading=parsed.reading || "Imported reading";
      initialData.aliyot=parsed.aliyot.map(a=>({
        name:a.name || "Aliyah", segments:a.segments.map(seg=>({...seg}))
      }));
      const prefix=(initialData.reading.match(/^\s*([A-Za-z0-9_-]+)/) || [,"Reading"])[1];
      readingId.value=prefix;
      const refs=[];
      for (const a of initialData.aliyot) for (const seg of a.segments) {
        if (!refs.includes(seg.verse)) refs.push(seg.verse);
        if (!seg.lineNumber) seg.lineNumber=refs.indexOf(seg.verse)+1;
      }
      remoteAudioUrl=parsed.audioUrl || "";
      clearLocalFile(); audioUrl.value=remoteAudioUrl;
      render(); refreshJson();
      if (remoteAudioUrl) loadAudio();
      else status("Timing data loaded. Select a local MP3 or enter a URL.");
      return;
    }
    const entries=catalogEntries(parsed);
    if (!entries.length) throw new Error("No readings with aliyot found.");
    hhCatalog=Object.fromEntries(entries);
    hhCatalogSource=parsed.source || "";
    hhReading.replaceChildren();
    for(const [key,r] of entries){
      const o=document.createElement("option");o.value=key;
      o.textContent=(r.name || key)+" ("+key+")";
      hhReading.appendChild(o);
    }
    hhReading.disabled=false;
    updateAliyahOptions();
  }catch(err){status("JSON import failed: "+err.message);}
});
hhReading.addEventListener("change",updateAliyahOptions);
hhAliyah.addEventListener("change",selectHHAliyah);


let activeExportCancel = null;
let playing = false;
let activeEnd = null;
let activeLabel = "";
let sequence = null;
let sequenceIndex = -1;

function status(text) { statusEl.textContent = text; }

function clearLocalFile() {
  localAudioFile = null;
  localMp3.value = "";
  if (localObjectUrl) { URL.revokeObjectURL(localObjectUrl); localObjectUrl = null; }
  decodedAudio = null;
  decodedUrl = null;
}

function loadAudio() {
  stopAudio();
  const url = localAudioFile ? (localObjectUrl || (localObjectUrl = URL.createObjectURL(localAudioFile))) : audioUrl.value.trim();
  if (!url) {
    status("Enter an MP3 URL.");
    return;
  }
  decodedAudio = null;
  decodedUrl = null;
  audio.src = url;
  audio.load();
  status(localAudioFile ? "Loading local audio: " + localAudioFile.name : "Loading MP3 from URL...");
}

audio.addEventListener("loadedmetadata", () => {
  status("MP3 loaded. Duration: " + audio.duration.toFixed(2) + " s");
});

audio.addEventListener("error", () => {
  status("Unable to load MP3 in this browser.");
});

audio.addEventListener("timeupdate", () => {
  clockEl.textContent = audio.currentTime.toFixed(2) + " s";

  if (playing && activeEnd !== null && audio.currentTime >= activeEnd) {
    if (sequence) {
      advanceSequence();
    } else {
      audio.pause();
      playing = false;
      status("Stopped at " + activeEnd.toFixed(2) + " s");
    }
  }
});

audio.addEventListener("ended", () => {
  playing = false;
  if (sequence && sequenceIndex < sequence.length - 1) {
    advanceSequence();
  } else {
    sequence = null;
    sequenceIndex = -1;
    status("Finished");
  }
});

function stopAudio() {
  if (activeExportCancel) { activeExportCancel(); status("Export cancelled."); return; }
  playing = false;
  sequence = null;
  sequenceIndex = -1;
  activeEnd = null;
  audio.pause();
  status("Stopped");
}

function playRange(segment, label) {
  if (!audio.src) loadAudio();

  const start = Number(segment.start);
  const end = segment.end === null || segment.end === "" ? null : Number(segment.end);

  if (!Number.isFinite(start) || start < 0) {
    status("Invalid start time for " + label);
    return;
  }
  if (end !== null && (!Number.isFinite(end) || end <= start)) {
    status("Invalid stop time for " + label);
    return;
  }

  activeEnd = end;
  activeLabel = label;
  audio.currentTime = start;
  playing = true;
  status("Playing " + label + " from " + start.toFixed(2) +
         (end === null ? " to natural end" : " to " + end.toFixed(2)));

  audio.play().catch(err => {
    playing = false;
    status("Playback error: " + err.message);
  });
}

function advanceSequence() {
  if (!sequence) return;
  audio.pause();
  sequenceIndex++;
  if (sequenceIndex >= sequence.length) {
    playing = false;
    sequence = null;
    sequenceIndex = -1;
    activeEnd = null;
    status("Aliyah finished");
    return;
  }
  const item = sequence[sequenceIndex];
  playRange(item.segment, item.label);
}

function playAliyah(aliyah) {
  const valid = aliyah.segments.filter(s => Number.isFinite(Number(s.start)));
  if (!valid.length) {
    status("This aliyah has no playable segments.");
    return;
  }
  sequence = valid.map(s => ({ segment: s, label: s.verse || "segment" }));
  sequenceIndex = -1;
  advanceSequence();
}

function makeTimeInput(value, blankAllowed) {
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.01";
  input.min = "0";
  input.value = value === null && blankAllowed ? "" : Number(value || 0).toFixed(2);
  return input;
}

// Export uses the source audio bytes, not a real-time recording of playback.
async function getDecodedAudio() {
  const url = localAudioFile ? localObjectUrl : audioUrl.value.trim();
  if (decodedAudio && decodedUrl === url) return decodedAudio;
  let bytes;
  if (localAudioFile) {
    status("Decoding local audio for segment export...");
    bytes = await localAudioFile.arrayBuffer();
  } else {
    status("Fetching MP3 for segment export...");
    let response;
    try { response = await fetch(url, { mode: "cors" }); }
    catch (err) { throw new Error("Cannot fetch source MP3 for export (possibly blocked by CORS). Playback may still work. " + err.message); }
    if (!response.ok) throw new Error("MP3 fetch returned HTTP " + response.status);
    bytes = await response.arrayBuffer();
  }
  const context = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const decoded = await context.decodeAudioData(bytes);
    decodedAudio = decoded;
    decodedUrl = url;
    return decoded;
  } finally { await context.close(); }
}

// When decodeAudioData disagrees with HTML playback, capture requested intervals
// through the browser playback path, including early verses.
// This fallback takes real time and is intentionally limited to local MP3s.
async function captureSegmentFromPlayback(segment, label) {
  if (!localAudioFile) throw new Error("Decoded MP3 is shorter than playback. Select a local MP3 to enable playback-based export.");
  if (!audio.captureStream || !window.MediaRecorder)
    throw new Error("This browser does not support playback-based audio capture. Try Chrome or Edge.");
  const start = Number(segment.start);
  const requestedEnd = segment.end === null || segment.end === "" ? audio.duration : Number(segment.end);
  if (!Number.isFinite(start) || !Number.isFinite(requestedEnd) || start < 0 || requestedEnd <= start || requestedEnd > audio.duration + 0.25)
    throw new Error("Invalid export interval: " + start + "–" + requestedEnd + " s; playback duration " + audio.duration.toFixed(2) + " s.");
  // Do not call stopAudio here: its Stop button handler cancels an active export.
  playing = false; sequence = null; sequenceIndex = -1; activeEnd = null;
  audio.pause();
  if (audio.readyState < 1) throw new Error("Load the local MP3 before exporting.");
  const stream = audio.captureStream();
  const tracks = stream.getAudioTracks();
  if (!tracks.length) throw new Error("No audio track available for playback capture.");
  const preferred = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  const mimeType = preferred.find(t => MediaRecorder.isTypeSupported(t));
  if (!mimeType) throw new Error("No supported audio capture format in this browser.");
  const chunks = [];
  const recorder = new MediaRecorder(stream, {mimeType});
  return await new Promise((resolve, reject) => {
    let done = false;
    let watchdog;
    let captureFrame = null;
    const previousMuted = audio.muted;
    audio.muted = true; // Capture without audible playback.
    activeExportCancel = () => fail(new Error("Export cancelled by user."));
    const cleanup = () => {
      audio.removeEventListener("ended", finish);
      audio.removeEventListener("error", failPlayback);
      clearTimeout(watchdog);
      if (captureFrame !== null) cancelAnimationFrame(captureFrame);
      audio.pause();
      audio.muted = previousMuted;
      activeExportCancel = null;
      tracks.forEach(t => t.stop());
    };
    const fail = err => {
      if (done) return;
      done = true;
      cleanup();
      if (recorder.state !== "inactive") recorder.stop();
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const finish = () => {
      if (done) return;
      if (recorder.state === "inactive") { fail(new Error("Recorder stopped unexpectedly.")); return; }
      done = true;
      recorder.stop();
    };
    // requestAnimationFrame checks the boundary more frequently than timeupdate
    // (which can lag by 100–250 ms in Chromium).
    let lastReportedSecond = -1;
    const checkEnd = () => {
      if (done) return;
      if (audio.currentTime >= requestedEnd - 0.015) { finish(); return; }
      const second = Math.floor(Math.max(0, audio.currentTime-start));
      if (second !== lastReportedSecond) {
        lastReportedSecond = second;
        status("Capturing " + label + ": " + (audio.currentTime-start).toFixed(1) + " / " + (requestedEnd-start).toFixed(1) + " s (real time)...");
      }
      captureFrame = requestAnimationFrame(checkEnd);
    };
    const failPlayback = () => fail(new Error("Playback error during segment capture."));
    recorder.ondataavailable = e => {if (e.data.size) chunks.push(e.data);};
    recorder.onerror = e => fail(new Error(e.error?.message || "Recorder error."));
    recorder.onstop = async () => {
      cleanup();
      if (!done || !chunks.length) { reject(new Error("Playback capture produced no audio.")); return; }
      try {
        const bytes = await new Blob(chunks, {type:mimeType}).arrayBuffer();
        const context = new (window.AudioContext || window.webkitAudioContext)();
        try {
          const buffer = await context.decodeAudioData(bytes);
          if (buffer.duration < 0.1) throw new Error("Captured segment is empty.");
          resolve({channels:Array.from({length:buffer.numberOfChannels}, (_,i)=>buffer.getChannelData(i).slice()), sampleRate:buffer.sampleRate});
        } finally {await context.close();}
      } catch(err) {reject(new Error("Could not decode captured segment: " + err.message));}
    };
    audio.addEventListener("ended", finish);
    audio.addEventListener("error", failPlayback);
    watchdog = setTimeout(() => fail(new Error("Playback capture timed out.")), Math.ceil((requestedEnd-start+15)*1000));
    try {
      audio.currentTime = start;
      const begin = () => {
        if (done) return;
        // Do not start recording until seeking is complete.
        recorder.start(100);
        audio.play().then(() => {
          if (!done) captureFrame = requestAnimationFrame(checkEnd);
        }).catch(fail);
      };
      if (audio.seeking) audio.addEventListener("seeked", begin, {once:true});
      else begin();
    } catch(err) {fail(err);}
  });
}

function cutAudio(buffer, segment) {
  const start = Number(segment.start);
  const end = segment.end === null || segment.end === "" ? buffer.duration : Number(segment.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > buffer.duration + 0.02)
    throw new Error("Invalid segment boundaries for export (audio duration " + buffer.duration.toFixed(2) + " s).");
  const first = Math.round(start * buffer.sampleRate);
  const last = Math.min(buffer.length, Math.round(end * buffer.sampleRate));
  if (last <= first) throw new Error("Selected interval contains no samples.");
  return Array.from({length: buffer.numberOfChannels}, (_, channel) => buffer.getChannelData(channel).slice(first, last));
}

function encodeWav(channels, sampleRate) {
  const count = channels[0].length, numChannels = channels.length;
  const dataSize = count * numChannels * 2;
  const array = new ArrayBuffer(44 + dataSize), view = new DataView(array);
  const write = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset+i, str.charCodeAt(i)); };
  write(0,"RIFF"); view.setUint32(4,36+dataSize,true); write(8,"WAVE"); write(12,"fmt ");
  view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,numChannels,true);
  view.setUint32(24,sampleRate,true); view.setUint32(28,sampleRate*numChannels*2,true);
  view.setUint16(32,numChannels*2,true); view.setUint16(34,16,true);
  write(36,"data"); view.setUint32(40,dataSize,true);
  let pos=44;
  for(let i=0;i<count;i++) for(let c=0;c<numChannels;c++) {
    const value=Math.max(-1,Math.min(1,channels[c][i]));
    view.setInt16(pos,value<0?value*32768:value*32767,true); pos+=2;
  }
  return new Blob([array],{type:"audio/wav"});
}

async function loadMp3Encoder() {
  if (window.lamejs?.Mp3Encoder) return;
  // Only MP3 output needs this library. If the CDN is blocked, WAV remains available.
  await new Promise((resolve,reject)=>{
    const script=document.createElement("script");
    script.src="https://cdn.jsdelivr.net/npm/lamejs@1.2.1/lame.min.js";
    script.onload=resolve;
    script.onerror=()=>reject(new Error("Could not load MP3 encoder. Try WAV instead."));
    document.head.appendChild(script);
  });
  if (!window.lamejs?.Mp3Encoder) throw new Error("MP3 encoder unavailable. Try WAV instead.");
}
function toInt16(floatSamples) {
  const out=new Int16Array(floatSamples.length);
  for(let i=0;i<floatSamples.length;i++) {
    const v=Math.max(-1,Math.min(1,floatSamples[i]));
    out[i]=v<0?v*32768:v*32767;
  }
  return out;
}
async function encodeMp3(channels, sampleRate) {
  await loadMp3Encoder();
  // LAME supports mono/stereo; downmix sources with more than two channels.
  const count=Math.min(2,channels.length);
  const encoder=new window.lamejs.Mp3Encoder(count,sampleRate,128);
  const pcm=channels.slice(0,count).map(toInt16), chunks=[];
  for(let i=0;i<pcm[0].length;i+=1152) {
    const part=count===1?encoder.encodeBuffer(pcm[0].subarray(i,i+1152)):
      encoder.encodeBuffer(pcm[0].subarray(i,i+1152),pcm[1].subarray(i,i+1152));
    if(part.length) chunks.push(new Uint8Array(part));
  }
  const tail=encoder.flush(); if(tail.length) chunks.push(new Uint8Array(tail));
  return new Blob(chunks,{type:"audio/mpeg"});
}
function safeName(label) {
  return (label || "segment").trim().replace(/[^a-zA-Z0-9_-]+/g,"_").replace(/^_+|_+$/g,"").slice(0,90) || "segment";
}
async function saveSegment(segment, label, button) {
  button.disabled=true;
  status("Preparing export for " + label + "...");
  try {
    const buffer=await getDecodedAudio();
    const start=Number(segment.start);
    const end=segment.end === null || segment.end === "" ? audio.duration : Number(segment.end);
    // An irregular MP3 may decode to a shorter, misaligned PCM timeline.
    const playbackLonger=Number.isFinite(audio.duration) && audio.duration > buffer.duration + 0.5;
    // A duration mismatch means the decoded PCM timeline cannot be trusted,
    // even for early verses. Use the browser playback timeline for ALL segments.
    const needsFallback=playbackLonger;
    console.info("[Audio Export]", label, "playback:", audio.duration.toFixed(2),
      "decoded:", buffer.duration.toFixed(2), "method:", needsFallback ? "PLAYBACK CAPTURE" : "PCM SLICE");
    let channels, sampleRate;
    if (needsFallback) {
      status("MP3 time-base mismatch (playback " + audio.duration.toFixed(2) + " s; decoded " + buffer.duration.toFixed(2) + " s). Using playback-based export for " + label + "...");
      ({channels, sampleRate}=await captureSegmentFromPlayback(segment,label));
    } else {
      channels=cutAudio(buffer,segment);
      sampleRate=buffer.sampleRate;
    }
    const format=outputFormat.value;
    status("Encoding " + label + " as " + format.toUpperCase() + "...");
    const blob=format==="wav"?encodeWav(channels,sampleRate):await encodeMp3(channels,sampleRate);
    const href=URL.createObjectURL(blob);
    const startingNumber = Number(exportStartLine.value);
    if (!Number.isSafeInteger(startingNumber) || startingNumber < 1)
      throw new Error("Starting line number must be a positive whole number.");
    // Number by displayed segment order, not JSON lineNumber.
    let segmentIndex = 0;
    let found = false;
    for (const aliyah of initialData.aliyot) {
      const index = aliyah.segments.indexOf(segment);
      if (index !== -1) { segmentIndex += index; found = true; break; }
      segmentIndex += aliyah.segments.length;
    }
    if (!found) throw new Error("Could not locate segment for export numbering.");
    const baseName = readingId.value.trim()
      ? safeName(readingId.value)+"_line"+(startingNumber + segmentIndex)
      : safeName(label);
    const suffix = fileSuffix.value.trim() ? "_"+safeName(fileSuffix.value) : "";
    const link=document.createElement("a"); link.href=href;
    link.download=baseName+suffix+"."+format;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(()=>URL.revokeObjectURL(href),60000);
    status("Saved " + link.download + " (" + (blob.size/1024).toFixed(0) + " KB).");
  } catch(err) { status("Export failed: " + err.message); }
  finally { button.disabled=false; }
}

function render() {
  aliyahsEl.innerHTML = "";

  initialData.aliyot.forEach((aliyah, ai) => {
    const box = document.createElement("div");
    box.className = "aliyah";

    const head = document.createElement("div");
    head.className = "aliyah-head";

    const title = document.createElement("input");
    title.type = "text";
    title.value = aliyah.name;
    title.addEventListener("input", () => { aliyah.name = title.value; refreshJson(); });

    const play = document.createElement("button");
    play.textContent = "Play Aliyah";
    play.className = "primary";
    play.addEventListener("click", () => playAliyah(aliyah));

    const remove = document.createElement("button");
    remove.textContent = "Remove Aliyah";
    remove.addEventListener("click", () => {
      stopAudio();
      initialData.aliyot.splice(ai, 1);
      render();
      refreshJson();
    });

    head.append(title, play, remove);
    box.appendChild(head);

    const table = document.createElement("table");
    table.innerHTML =
      "<thead><tr><th>Verse / Section</th><th>Start (s)</th><th>Stop (s)</th><th>Test</th><th></th></tr></thead>";

    const tbody = document.createElement("tbody");

    aliyah.segments.forEach((seg, si) => {
      const tr = document.createElement("tr");

      const verseTd = document.createElement("td");
      const verse = document.createElement("input");
      verse.type = "text";
      verse.value = seg.verse;
      verse.addEventListener("input", () => { seg.verse = verse.value; refreshJson(); });
      verseTd.appendChild(verse);

      const startTd = document.createElement("td");
      const start = makeTimeInput(seg.start, false);
      start.addEventListener("input", () => {
        seg.start = start.value === "" ? null : Number(start.value);
        refreshJson();
      });
      startTd.appendChild(start);

      const endTd = document.createElement("td");
      const end = makeTimeInput(seg.end, true);
      end.placeholder = "natural";
      end.addEventListener("input", () => {
        seg.end = end.value === "" ? null : Number(end.value);
        refreshJson();
      });
      endTd.appendChild(end);

      const testTd = document.createElement("td");
      testTd.className = "rowbuttons";
      const test = document.createElement("button");
      test.textContent = "Play Segment";
      test.addEventListener("click", () => {
        sequence = null;
        sequenceIndex = -1;
        playRange(seg, seg.verse || "segment");
      });
      testTd.appendChild(test);
      const save = document.createElement("button");
      save.textContent = "Save Segment";
      save.addEventListener("click", () => saveSegment(seg, seg.verse || "segment", save));
      testTd.appendChild(save);

      const deleteTd = document.createElement("td");
      const del = document.createElement("button");
      del.textContent = "×";
      del.title = "Delete segment";
      del.addEventListener("click", () => {
        stopAudio();
        aliyah.segments.splice(si, 1);
        render();
        refreshJson();
      });
      deleteTd.appendChild(del);

      tr.append(verseTd, startTd, endTd, testTd, deleteTd);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    box.appendChild(table);

    const addSegment = document.createElement("button");
    addSegment.textContent = "+ Add Verse / Segment";
    addSegment.addEventListener("click", () => {
      const last = aliyah.segments[aliyah.segments.length - 1];
      const guess = last && last.end !== null ? Number(last.end) : 0;
      aliyah.segments.push({ verse: "", start: guess, end: null });
      render();
      refreshJson();
    });

    box.appendChild(addSegment);
    aliyahsEl.appendChild(box);
  });
}

function refreshJson() {
  initialData.audioUrl = localAudioFile ? remoteAudioUrl : audioUrl.value.trim();
  if (localAudioFile) initialData.localAudioFileName = localAudioFile.name;
  else delete initialData.localAudioFileName;
  const startNumber=Number(exportStartLine.value);
  const numbered=Number.isSafeInteger(startNumber) && startNumber >= 1 ? startNumber : 1;
  const exported=JSON.parse(JSON.stringify(initialData));
  let n=numbered;
  for (const aliyah of exported.aliyot) for (const segment of aliyah.segments)
    segment.lineNumber=n++;
  jsonOutput.value=JSON.stringify(exported,null,2);
}

document.getElementById("ats-loadBtn").addEventListener("click", loadAudio);
localMp3.addEventListener("change", () => {
  const file = localMp3.files?.[0];
  if (!file) return;
  if (!localAudioFile) remoteAudioUrl = audioUrl.value.trim();
  clearLocalFile();
  localAudioFile = file;
  localMp3.value = ""; // Allow choosing the same file again later.
  audioUrl.value = file.name;
  refreshJson();
  loadAudio();
});
document.getElementById("ats-stopBtn").addEventListener("click", stopAudio);

document.getElementById("ats-addAliyahBtn").addEventListener("click", () => {
  initialData.aliyot.push({
    name: "New Aliyah",
    segments: [{ verse: "", start: 0.00, end: null }]
  });
  render();
  refreshJson();
});

document.getElementById("ats-refreshJsonBtn").addEventListener("click", refreshJson);
exportStartLine.addEventListener("input",refreshJson);
document.getElementById("ats-saveJsonBtn").addEventListener("click",()=>{
  const n=Number(exportStartLine.value);
  if (!Number.isSafeInteger(n) || n < 1) { status("Starting line number must be a positive whole number."); return; }
  refreshJson();
  const name=safeName(readingId.value.trim() || initialData.reading || "Timing")+"_timing.json";
  const blob=new Blob([jsonOutput.value],{type:"application/json"});
  const href=URL.createObjectURL(blob);
  const link=document.createElement("a"); link.href=href; link.download=name;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(href),60000);
  status("Saved " + name);
});

document.getElementById("ats-copyJsonBtn").addEventListener("click", async () => {
  refreshJson();
  try {
    await navigator.clipboard.writeText(jsonOutput.value);
    status("Timing JSON copied.");
  } catch {
    jsonOutput.select();
    document.execCommand("copy");
    status("Timing JSON copied.");
  }
});

audioUrl.addEventListener("input", () => {
  if (localAudioFile) { clearLocalFile(); audio.removeAttribute("src"); audio.load(); status("Local file deselected. Click Load / Reload MP3 to use the entered URL."); }
  remoteAudioUrl = audioUrl.value.trim();
  refreshJson();
});

render();
refreshJson();
loadAudio();
  }
})();
