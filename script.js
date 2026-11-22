// DATA LOKASI: ubah nama/koordinat di sini jika diperlukan.
const places=[
{name:"Halte FT",lat:-6.361320,lng:106.823333,qr:"QR-001"},
{name:"Gedung IDE",lat:-6.363645,lng:106.822385,qr:"QR-002"},
{name:"Parkiran",lat:-6.361533,lng:106.823230,qr:"QR-003"},
{name:"Gedung K",lat:-6.362442,lng:106.824039,qr:"QR-004"},
{name:"Gedung GK",lat:-6.361241,lng:106.824670,qr:"QR-005"},
{name:"Gedung S",lat:-6.361514,lng:106.824673,qr:"QR-006"}
];
// Rute survei manual Halte FT -> Gedung S.
const halteToS=[
[-6.361320,106.823333],[-6.361244,106.823393],[-6.361190,106.823449],
[-6.361174,106.823514],[-6.361148,106.823624],[-6.361121,106.823801],
[-6.361177,106.823854],[-6.361286,106.823956],[-6.361382,106.824053],
[-6.361446,106.824104],[-6.361518,106.824179],[-6.361601,106.824249],
[-6.361694,106.824418],[-6.361691,106.824525],[-6.361699,106.824797],
[-6.361662,106.824861],[-6.361588,106.824861],[-6.361564,106.824826],
[-6.361569,106.824799],[-6.361514,106.824673]
];
const start=document.getElementById("startingPoint"), dest=document.getElementById("destination");
const statusEl=document.getElementById("status"), details=document.getElementById("routeDetails");
const routeInfo=document.getElementById("routeInfo");
places.forEach(p=>{for(const select of [start,dest]){const o=document.createElement("option");o.value=p.name;o.textContent=p.name;select.appendChild(o)}});
const map=L.map("map").setView([-6.36227,106.82371],17);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:21,attribution:'&copy; OpenStreetMap'}).addTo(map);
let routeLayer=null,gpsId=null,userMarker=null,accuracyCircle=null,scanner=null;
const byName=n=>places.find(p=>p.name===n);
function clearRoute(){if(routeLayer){map.removeLayer(routeLayer);routeLayer=null}}
function drawRoute(coords,a,b){
 clearRoute();
 const edge=L.polyline(coords,{color:"#fff",weight:11,lineCap:"round",lineJoin:"round"});
 const line=L.polyline(coords,{color:"#111",weight:6,lineCap:"round",lineJoin:"round"});
 routeLayer=L.featureGroup([edge,line,L.marker([a.lat,a.lng]).bindPopup("Titik awal: "+a.name),L.marker([b.lat,b.lng]).bindPopup("Tujuan: "+b.name)]).addTo(map);
 map.fitBounds(routeLayer.getBounds(),{padding:[20,20],maxZoom:20});
}
async function findRoute(){
 const a=byName(start.value),b=byName(dest.value);
 if(!a||!b){statusEl.textContent="Silakan pilih titik awal dan tujuan.";return}
 if(a.name===b.name){statusEl.textContent="Titik awal dan tujuan tidak boleh sama.";return}
 statusEl.textContent="Sedang mencari rute...";
 try{
  let coords;
  if(a.name==="Halte FT"&&b.name==="Gedung S"){
   coords=halteToS;
   details.innerHTML="<p><b>Halte FT → Gedung S</b></p><p>Menggunakan koordinat rute survei yang dimasukkan ke prototype.</p>";
  }else{
   const url=`https://routing.openstreetmap.de/routed-foot/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
   const res=await fetch(url);if(!res.ok)throw Error("Layanan rute tidak merespons.");
   const data=await res.json();if(!data.routes?.length)throw Error("Rute tidak ditemukan.");
   coords=data.routes[0].geometry.coordinates.map(c=>[c[1],c[0]]);
   details.innerHTML=`<p><b>${a.name} → ${b.name}</b></p><p>Perkiraan jarak ${(data.routes[0].distance/1000).toFixed(2)} km.</p>`;
  }
  drawRoute(coords,a,b);routeInfo.hidden=false;
  statusEl.textContent="Rute tampil. Tekan Mulai Navigasi GPS untuk melihat posisi yang terus diperbarui.";
 }catch(e){console.error(e);statusEl.textContent="Rute gagal ditampilkan: "+e.message}
}
function startGps(){
 if(!navigator.geolocation){
  statusEl.textContent="Browser tidak mendukung GPS.";
  return;
 }

 if(gpsId!==null)return;

 statusEl.textContent="Meminta izin lokasi...";

 gpsId=navigator.geolocation.watchPosition(pos=>{
  const pt=[pos.coords.latitude,pos.coords.longitude];
 console.log("Posisi GPS terbaru:", pt);
 const acc=pos.coords.accuracy;
  if(!userMarker){
   userMarker=L.circleMarker(pt,{
    radius:9,
    color:"#fff",
    weight:3,
    fillColor:"#1677ff",
    fillOpacity:1
   }).addTo(map).bindPopup("Lokasi kamu");

   accuracyCircle=L.circle(pt,{
    radius:acc,
    color:"#1677ff",
    fillOpacity:.1
   }).addTo(map);

   map.setView(pt,19);
  } else {
   userMarker.setLatLng(pt);
   accuracyCircle.setLatLng(pt);
   accuracyCircle.setRadius(acc);

   // Membuat peta mengikuti posisi pengguna
   map.panTo(pt,{
    animate:true,
    duration:0.5
   });
  }

  statusEl.textContent=`GPS aktif · akurasi sekitar ${Math.round(acc)} meter. Peta mengikuti pergerakan kamu.`;

 },err=>{
  statusEl.textContent=({
   1:"Izin lokasi ditolak. Aktifkan izin GPS.",
   2:"Lokasi belum tersedia. Coba area terbuka.",
   3:"GPS terlalu lama merespons."
  })[err.code]||"GPS bermasalah.";

  stopGps();

 },{
  enableHighAccuracy:true,
  maximumAge:1000,
  timeout:15000
 });

 document.getElementById("startNavigationButton").disabled=true;
 document.getElementById("stopNavigationButton").disabled=false;
}
function stopGps(){if(gpsId!==null){navigator.geolocation.clearWatch(gpsId);gpsId=null}document.getElementById("startNavigationButton").disabled=false;document.getElementById("stopNavigationButton").disabled=true;statusEl.textContent="Pelacakan GPS dihentikan."}
// QR kamera bawaan HP: https://DOMAIN-KAMU/?awal=QR-001&tujuan=QR-006
function applyQrParams(){
 const q=new URLSearchParams(location.search),a=places.find(p=>p.qr===q.get("awal")),b=places.find(p=>p.qr===q.get("tujuan"));
 if(a){start.value=a.name;map.setView([a.lat,a.lng],19);statusEl.textContent="Titik awal dari QR: "+a.name}
 if(b)dest.value=b.name;
}
async function startScanner(){
 const out=document.getElementById("qrStatus");if(typeof Html5Qrcode==="undefined"){out.textContent="Library QR tidak termuat.";return}
 try{scanner=new Html5Qrcode("qr-reader");await scanner.start({facingMode:"environment"},{fps:10,qrbox:{width:220,height:220}},async text=>{const p=places.find(x=>x.qr===text.trim());if(!p){out.textContent="QR tidak dikenali: "+text;return}start.value=p.name;map.setView([p.lat,p.lng],19);out.textContent="Titik awal: "+p.name;await stopScanner()});out.textContent="Arahkan kamera ke QR." ;document.getElementById("closeScanButton").disabled=false}
 catch(e){console.error(e);out.textContent="Kamera gagal dibuka. Gunakan HTTPS/localhost dan izinkan kamera.";scanner=null}
}
async function stopScanner(){if(scanner){try{if(scanner.isScanning)await scanner.stop();await scanner.clear()}catch(e){console.error(e)}scanner=null}document.getElementById("closeScanButton").disabled=true}
document.getElementById("findRouteButton").addEventListener("click",findRoute);
document.getElementById("startNavigationButton").addEventListener("click",startGps);
document.getElementById("stopNavigationButton").addEventListener("click",stopGps);
document.getElementById("scanButton").addEventListener("click",startScanner);
document.getElementById("closeScanButton").addEventListener("click",stopScanner);
applyQrParams();
