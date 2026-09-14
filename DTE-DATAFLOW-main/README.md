# उत्तर प्रदेश प्रशिक्षण एवं सेवायोजन निदेशालय - फील्ड यूनिट डेटा एवं अनुपालन पोर्टल
## DTE Uttar Pradesh - Field Units Data Portal

प्रशिक्षण एवं सेवायोजन निदेशालय (मुख्यालय, लखनऊ), समस्त 18 मण्डल संयुक्त निदेशक (JD) कार्यालयों तथा समस्त 305+ राजकीय औद्योगिक प्रशिक्षण संस्थानों (ITI) के मध्य रियल-टाइम डेटा संकलन, सूचना मांग (Requisition), अनुपालन एवं समय-सीमा विस्तार हेतु एकीकृत वेब पोर्टल।

---

## 🚀 मुख्य विशेषताएं (Key Features)

1. **मुख्यालय प्रकोष्ठ (Directorate Desks)**:
   - 5-स्तरीय लक्षित क्षेत्रीय इकाई चयन (All Units, Only JDs, Only ITIs, Mandal-wise JDs, District/ITI-wise ITIs)
   - शासनादेश / आधिकारिक दिशा-निर्देश संलग्नक
   - समयावधि (Deadline), विलम्ब चेतावनी व डिफ़ॉल्टर नोटिस जारी करने की व्यवस्था
   - कस्टमाइज़ेबल डेटा तालिका व एक्सेल/सीएसवी निर्यात

2. **मण्डलीय संयुक्त निदेशक (JD Offices)**:
   - 18 मण्डलों की व्यापक समीक्षा व अनुमोदन वर्कफ़्लो
   - मण्डल-स्तरीय प्रगति एवं रैंकिंग डैशबोर्ड

3. **राजकीय आईटीआई (Govt ITIs)**:
   - 305+ राजकीय आईटीआई हेतु सरल डेटा प्रविष्टि प्रपत्र
   - आधिकारिक घोषणा, हस्ताक्षर/मुहर सत्यापन व रसीद

---

## 🛠️ स्थानीय सिस्टम पर कैसे चलाएं (How to Run Locally)

### 1. पूर्वापेक्षाएँ (Prerequisites)
- Node.js (v18 या अधिक)
- npm या yarn

### 2. स्थापना (Installation)
```bash
# प्रोजेक्ट फ़ोल्डर में जाएं
cd dte-portal

# निर्भरताएं (Dependencies) इंस्टॉल करें
npm install
```

### 3. डेवलपमेंट सर्वर शुरू करें (Start Dev Server)
```bash
npm run dev
```
ब्राउज़र में `http://localhost:3000` या टर्मिनल में दिए गए URL को खोलें।

### 4. प्रोडक्शन बिल्ड (Build for Production / GitHub Pages / Server)
```bash
npm run build
```
यह `dist/` फ़ोल्डर तैयार करेगा जिसे किसी भी वेब सर्वर (Nginx, Apache, GitHub Pages, Vercel आदि) पर सीधे होस्ट किया जा सकता है।

---

## 🌐 GitHub Pages पर होस्ट करना (Deploy to GitHub Pages)
1. GitHub पर एक नई रिपॉजिटरी बनाएं।
2. इस फ़ोल्डर की सभी फाइलें GitHub पर पुश करें:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of DTE Portal"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. GitHub Settings → Pages में जाकर **GitHub Actions** या **Branch: main / root** चुनकर लाइव करें।

---
**प्रशिक्षण एवं सेवायोजन निदेशालय, उत्तर प्रदेश शासन**
