import { DirectorateDesk, FieldUnit, Requisition, SubmissionRecord, ExtensionRequest } from '../types/portal';

export const INITIAL_DESKS: DirectorateDesk[] = [
  {
    id: 'desk-appr',
    code: 'DTE-UP-APPR',
    name: 'शिक्षुता अनुभाग (Apprenticeship Section)',
    officerInCharge: '',
    designation: 'उप निदेशक (शिक्षुता एवं उद्योग अनुबंध)',
    email: 'apprenticeship.dte-up@gov.in',
    phone: '+91 522 262 8801',
    description: 'राष्ट्रीय शिक्षुता संवर्धन योजना (NAPS), मुख्यमंत्री शिक्षुता प्रोत्साहन योजना (CMAPS), अप्रेंटिसशिप मेला एवं उद्योग अनुबंध।',
    iconName: 'Building2',
    colorScheme: 'emerald'
  },
  {
    id: 'desk-ppp',
    code: 'DTE-UP-PPP',
    name: 'पी.पी.पी. मॉडल संबंधी कार्य (PPP Model Section)',
    officerInCharge: '',
    designation: 'उप निदेशक (पी.पी.पी. मॉडल एवं नवाचार)',
    email: 'ppp.dte-up@gov.in',
    phone: '+91 522 262 8802',
    description: 'राजकीय औद्योगिक प्रशिक्षण संस्थानों का पब्लिक प्राइवेट पार्टनरशिप (PPP) मॉडल संचालन, निजी पार्टनर समन्वय एवं वित्तीय समीक्षा।',
    iconName: 'Layers',
    colorScheme: 'blue'
  },
  {
    id: 'desk-dev-const',
    code: 'DTE-UP-DEV-CONST',
    name: 'विकास (निर्माण) अनुभाग (Development & Construction Section)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (विकास एवं निर्माण)',
    email: 'construction.dte-up@gov.in',
    phone: '+91 522 262 8803',
    description: 'नवीन राजकीय आईटीआई भवनों के निर्माण, कार्यदायी संस्थाओं का अनुश्रवण, तकनीकी स्वीकृति, बजट विमुक्ति एवं प्रगति समीक्षा।',
    iconName: 'Building',
    colorScheme: 'amber'
  },
  {
    id: 'desk-upgrade-1000',
    code: 'DTE-UP-UPG-1000',
    name: 'Upgradation of 1000 ITI संबंधी कार्य (Upgradation of 1000 ITIs Cell)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (आईटीआई उन्नयन एवं आधुनिकीकरण)',
    email: 'upgradation1000.dte-up@gov.in',
    phone: '+91 522 262 8804',
    description: 'टाटा टेक्नोलॉजीज 150 आईटीआई फेज-II एवं 1000 आईटीआई आधुनिकीकरण परियोजना, एडवांस्ड लैब स्थापना व इंडस्ट्री 4.0 ट्रेड संचालन।',
    iconName: 'Cpu',
    colorScheme: 'indigo'
  },
  {
    id: 'desk-bldg',
    code: 'DTE-UP-BLDG',
    name: 'भवन संबंधी कार्य (Building & Infrastructure Cell)',
    officerInCharge: '',
    designation: 'सहायक निदेशक (भवन एवं संपदा)',
    email: 'building.dte-up@gov.in',
    phone: '+91 522 262 8805',
    description: 'संस्थानों की भूमि, राजस्व अभिलेख, भवन आधिपत्य, अनापत्ति प्रमाण-पत्र (NOC), चारदीवारी निर्माण एवं संरचनात्मक सुरक्षा।',
    iconName: 'Building2',
    colorScheme: 'slate'
  },
  {
    id: 'desk-outsrc',
    code: 'DTE-UP-OUTSRC',
    name: 'आउटसोर्सिंग अनुदेशक, चतुर्थ श्रेणी संबंधी अनुभाग (Outsourcing Instructors & Class-IV Section)',
    officerInCharge: '',
    designation: 'उप निदेशक (आउटसोर्सिंग मैनपॉवर)',
    email: 'outsourcing.dte-up@gov.in',
    phone: '+91 522 262 8806',
    description: 'GeM पोर्टल / आउटसोर्सिंग सेवा प्रदाता के माध्यम से अनुदेशक एवं चतुर्थ श्रेणी कर्मचारियों की तैनाती, मानदेय भुगतान व वैधानिक अनुपालन।',
    iconName: 'Users',
    colorScheme: 'rose'
  },
  {
    id: 'desk-train',
    code: 'DTE-UP-TRAIN',
    name: 'प्रशिक्षण अनुभाग (Training Section)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (प्रशिक्षण एवं पाठ्यक्रम)',
    email: 'training.dte-up@gov.in',
    phone: '+91 522 262 8807',
    description: 'शिल्पकार प्रशिक्षण योजना (CTS), ड्यूल सिस्टम ऑफ ट्रेनिंग (DST), नया ट्रेड समावेशन, पाठ्यक्रम संशोधन एवं राज्य स्तरीय शैक्षणिक कैलेंडर।',
    iconName: 'BookOpen',
    colorScheme: 'teal'
  },
  {
    id: 'desk-ms-gis',
    code: 'DTE-UP-MS-GIS',
    name: 'मानव सम्पदा पोर्टल, GIS बेस्ड पोर्टल (Manav Sampada & GIS Portal Cell)',
    officerInCharge: '',
    designation: 'नोडल अधिकारी (मानव सम्पदा एवं GIS मैपिंग)',
    email: 'manavsampada.dte-up@gov.in',
    phone: '+91 522 262 8808',
    description: 'मानव सम्पदा पोर्टल ई-सर्विस बुक, ऑनलाइन अवकाश, स्थानांतरण, सेवा विवरण सत्यापन एवं आईटीआई का GIS बेस्ड जियो-टैगिंग मैपिंग।',
    iconName: 'Laptop',
    colorScheme: 'cyan'
  },
  {
    id: 'desk-legal',
    code: 'DTE-UP-LEGAL',
    name: 'विधि अनुभाग (Legal / Court Cases Section)',
    officerInCharge: '',
    designation: 'विधि अधिकारी / उप निदेशक (विधि)',
    email: 'legal.dte-up@gov.in',
    phone: '+91 522 262 8809',
    description: 'माननीय उच्च न्यायालय इलाहाबाद/लखनऊ खंडपीठ व अधिकरणों में योजित रिट याचिकाओं का प्रतिशपथ पत्र (CA), विधिक राय व न्यायालयी पैरवी।',
    iconName: 'Scale',
    colorScheme: 'stone'
  },
  {
    id: 'desk-place',
    code: 'DTE-UP-PLACE',
    name: 'प्लेसमेंट संबंधी कार्य (Placement & Campus Drives Cell)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (प्लेसमेंट एवं सेवायोजन)',
    email: 'rozgar.dte-up@gov.in',
    phone: '+91 522 262 8810',
    description: 'वृहद रोज़गार मेले, मारुति/टाटा व प्रमुख औद्योगिक प्रतिष्ठानों के ऑन-कैंपस चयन अभियान, मिशन रोज़गार एवं इंडियास्किल्स प्रतिभागी डेटा।',
    iconName: 'Briefcase',
    colorScheme: 'teal'
  },
  {
    id: 'desk-eoffice',
    code: 'DTE-UP-EOFFICE',
    name: 'ई-ऑफिस प्रबंधन (e-Office Management Cell)',
    officerInCharge: '',
    designation: 'प्रभारी अधिकारी (ई-ऑफिस एवं डिजिटल गवर्नेंस)',
    email: 'eoffice.dte-up@gov.in',
    phone: '+91 522 262 8811',
    description: 'एनआईसी ई-ऑफिस (e-Office) प्रणाली का क्रियान्वयन, इलेक्ट्रॉनिक फाइल ट्रैकिंग, डिजिटल हस्ताक्षर (DSC) एवं ई-फाइलिंग अनुश्रवण।',
    iconName: 'HardDrive',
    colorScheme: 'sky'
  },
  {
    id: 'desk-est-clerk',
    code: 'DTE-UP-EST-CLERK',
    name: 'स्थापना अराजपत्रित (लिपिक, चतुर्थ श्रेणी) अनुभाग (Est. Non-Gazetted - Clerical & Class-IV)',
    officerInCharge: '',
    designation: 'उप निदेशक (स्थापना अराजपत्रित-1)',
    email: 'est.clerical@dte-up@gov.in',
    phone: '+91 522 262 8812',
    description: 'वरिष्ठ/कनिष्ठ सहायक, आशुलिपिक एवं चतुर्थ श्रेणी संवर्ग के कार्मिकों की वरिष्ठता सूची, पदोन्नति, स्थानांतरण व अधिष्ठान सेवा प्रकरण।',
    iconName: 'Users',
    colorScheme: 'violet'
  },
  {
    id: 'desk-maint',
    code: 'DTE-UP-MAINT',
    name: 'संधारण अनुभाग (Maintenance Section)',
    officerInCharge: '',
    designation: 'सहायक निदेशक (संधारण एवं अनुरक्षण)',
    email: 'maintenance.dte-up@gov.in',
    phone: '+91 522 262 8813',
    description: 'संस्थानों की कार्यशालाओं, प्रयोगशालाओं, ओवरहेड टैंक, ड्रेनेज व सामान्य संधारण एवं मरम्मत कार्यों का बजट आवंटन व अनुश्रवण।',
    iconName: 'Wrench',
    colorScheme: 'amber'
  },
  {
    id: 'desk-est-store',
    code: 'DTE-UP-EST-STORE',
    name: 'स्थापना अराजपत्रित (कार्मिक, भण्डार संवर्ग, भण्डार परिचर, कार्यशाला परिचर) (Est. Store Cadre & Attendants)',
    officerInCharge: '',
    designation: 'उप निदेशक (स्थापना अराजपत्रित-2)',
    email: 'est.store@dte-up@gov.in',
    phone: '+91 522 262 8814',
    description: 'भण्डार अधीक्षक, भण्डार लिपिक, भण्डार परिचर, कार्यशाला परिचर संवर्ग की सेवा पुस्तिका, एसीपी, पदोन्नति व पदस्थापन प्रबंधन।',
    iconName: 'Users',
    colorScheme: 'purple'
  },
  {
    id: 'desk-procure',
    code: 'DTE-UP-PROCURE',
    name: 'साज-सज्जा उपकरण व क्रय संबंधी कार्य (Equipment, Tools & Procurement Cell)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (क्रय एवं साज-सज्जा)',
    email: 'procurement.dte-up@gov.in',
    phone: '+91 522 262 8815',
    description: 'GeM पोर्टल के माध्यम से ट्रेड-वार मशीनरी, टूल किट्स, रॉ-मटेरियल, आईटी उपकरण एवं प्रयोगशाला साज-सज्जा का केंद्रीयकृत क्रय व आपूर्ति।',
    iconName: 'ShoppingBag',
    colorScheme: 'emerald'
  },
  {
    id: 'desk-ddo-store',
    code: 'DTE-UP-DDO-STORE',
    name: 'आहरण एवं वितरण कार्य,भण्डार (Drawing & Disbursing / Store Cell)',
    officerInCharge: '',
    designation: 'वरिष्ठ लेखाधिकारी / आहरण एवं वितरण अधिकारी (DDO)',
    email: 'ddo.store@dte-up@gov.in',
    phone: '+91 522 262 8816',
    description: 'बजट आहरण, वेतन विपत्र, आकस्मिक व्यय, केंद्रीय भण्डार स्टॉक इन्वेंटरी, भौतिक सत्यापन एवं वित्तीय अंकेक्षण समन्वय।',
    iconName: 'DollarSign',
    colorScheme: 'green'
  },
  {
    id: 'desk-elec-pay',
    code: 'DTE-UP-ELEC-PAY',
    name: 'केंद्रीयकृत विद्युत भुगतान संबंधी कार्य (Centralized Electricity Payment Cell)',
    officerInCharge: '',
    designation: 'नोडल अधिकारी (विद्युत बिलिंग एवं ऊर्जा प्रबंधन)',
    email: 'electricity.dte-up@gov.in',
    phone: '+91 522 262 8817',
    description: 'UPPCL पोर्टल पर समस्त राजकीय आईटीआई के स्वीकृत विद्युत भार, मासिक विद्युत बिल सत्यापन, केंद्रीयकृत ऑनलाइन भुगतान व सौर ऊर्जा संयंत्र।',
    iconName: 'Zap',
    colorScheme: 'yellow'
  },
  {
    id: 'desk-scholar',
    code: 'DTE-UP-SCHOLAR',
    name: 'प्रशिक्षार्थियों की छात्रवृति व शुल्क प्रतिपूर्ति संबंधी कार्य (Scholarship & Fee Reimbursement Cell)',
    officerInCharge: '',
    designation: 'सहायक निदेशक (छात्रवृत्ति एवं शुल्क प्रतिपूर्ति)',
    email: 'scholarship.dte-up@gov.in',
    phone: '+91 522 262 8818',
    description: 'समाज कल्याण / पिछड़ा वर्ग / अल्पसंख्यक छात्रवृत्ति पोर्टल मास्टर डेटा, छात्र आवेदन सत्यापन, शुल्क प्रतिपूर्ति एवं डीबीटी भुगतान।',
    iconName: 'GraduationCap',
    colorScheme: 'rose'
  },
  {
    id: 'desk-est-inst',
    code: 'DTE-UP-EST-INST',
    name: 'स्थापना अराजपत्रित(अनुदेशक) व अतिथिवक्ता संबंधी कार्य (Est. Instructors & Guest Faculty Cell)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (स्थापना अनुदेशक)',
    email: 'instructors.dte-up@gov.in',
    phone: '+91 522 262 8819',
    description: 'व्यावसायिक अनुदेशकों की राज्य स्तरीय वरिष्ठता, पदोन्नति, स्थानांतरण, गेस्ट फैकल्टी चयन, मानदेय भुगतान एवं बायोमेट्रिक उपस्थिति।',
    iconName: 'Users',
    colorScheme: 'indigo'
  },
  {
    id: 'desk-est-hq-pension',
    code: 'DTE-UP-EST-HQ-PENSION',
    name: 'स्थापना मुख्यालय संबंधी कार्य, पेंशन(प्रशि.) अनुभाग (Establishment HQ & Pension Section)',
    officerInCharge: '',
    designation: 'उप निदेशक (मुख्यालय स्थापना एवं पेंशन)',
    email: 'pension.dte-up@gov.in',
    phone: '+91 522 262 8820',
    description: 'मुख्यालय कार्मिकों की स्थापना, सेवानिवृत्त अधिकारियों/कर्मचारियों के पेंशन प्रकरण, जीपीएफ, उपादान, पारिवारिक पेंशन एवं सेवांत हितलाभ।',
    iconName: 'HeartHandshake',
    colorScheme: 'red'
  },
  {
    id: 'desk-est-gaz',
    code: 'DTE-UP-EST-GAZ',
    name: 'स्थापना राजपत्रित (Establishment Gazetted Section)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (स्थापना राजपत्रित)',
    email: 'est.gazetted@dte-up@gov.in',
    phone: '+91 522 262 8821',
    description: 'प्रधानाचार्य (प्रथम/द्वितीय श्रेणी), उप निदेशक, संयुक्त निदेशक संवर्ग के पदस्थापन, वार्षिक गोपनीय आख्या (ACR), पदोन्नति व सतर्कता जांच।',
    iconName: 'Award',
    colorScheme: 'purple'
  },
  {
    id: 'desk-griev',
    code: 'DTE-UP-GRIEV',
    name: 'शिकायत(प्रशिक्षण) अनुभाग (Grievance Training Section)',
    officerInCharge: '',
    designation: 'नोडल अधिकारी (शिकायत निवारण)',
    email: 'grievance.dte-up@gov.in',
    phone: '+91 522 262 8822',
    description: 'प्रशिक्षार्थियों, अभिभावकों एवं आमजन की प्रशिक्षण, परीक्षा व प्रवेश संबंधी शिकायतों की जांच, समाधान एवं समयबद्ध निस्तारण।',
    iconName: 'HelpCircle',
    colorScheme: 'orange'
  },
  {
    id: 'desk-rti-igrs',
    code: 'DTE-UP-RTI-IGRS',
    name: 'जनसूचना, जनसुनवाई (RTI & IGRS / Jansunwai Cell)',
    officerInCharge: '',
    designation: 'जन सूचना अधिकारी (PIO) एवं नोडल जनसुनवाई (IGRS)',
    email: 'rti.igrs@dte-up@gov.in',
    phone: '+91 522 262 8823',
    description: 'आरटीआई अधिनियम 2005 के अंतर्गत प्रथम/द्वितीय अपील, मुख्यमंत्री जनसुनवाई पोर्टल (IGRS), पीजी पोर्टल एवं समाधान दिवस संदर्भ।',
    iconName: 'FileText',
    colorScheme: 'blue'
  },
  {
    id: 'desk-inspect',
    code: 'DTE-UP-INSPECT',
    name: 'औद्योगिक प्रशिक्षण संस्थानों का निरीक्षण संबंधी कार्य (ITI Inspection & Quality Monitoring Cell)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (गुणवत्ता एवं निरीक्षण)',
    email: 'inspection.dte-up@gov.in',
    phone: '+91 522 262 8824',
    description: 'राजकीय एवं निजी आईटीआई का औचक निरीक्षण, बुनियादी ढांचा भौतिक सत्यापन, कार्यशाला उपकरण, ट्रेड संबद्धता व गुणवत्ता ऑडिट।',
    iconName: 'Search',
    colorScheme: 'emerald'
  },
  {
    id: 'desk-cert-exam',
    code: 'DTE-UP-CERT-EXAM',
    name: 'राष्ट्रीय व्यवसाय प्रमाण पत्र/SCVT प्रमाण पत्र संबंधी कार्य (NTC / SCVT Certification Section)',
    officerInCharge: '',
    designation: 'संयुक्त निदेशक (परीक्षा एवं प्रमाणन)',
    email: 'certificates.scvtup@gov.in',
    phone: '+91 522 262 8825',
    description: 'NCVT राष्ट्रीय व्यवसाय प्रमाण पत्र (NTC), SCVT राज्य व्यवसाय प्रमाण पत्र, डुप्लीकेट प्रमाण-पत्र, अंकपत्र संशोधन एवं ई-सत्यापन।',
    iconName: 'Award',
    colorScheme: 'indigo'
  },
  {
    id: 'desk-disposal',
    code: 'DTE-UP-DISPOSAL',
    name: 'निस्तारण एवं वसूली अनुभाग (Disposal & Recovery Section)',
    officerInCharge: '',
    designation: 'उप निदेशक (निस्तारण एवं वसूली)',
    email: '',
    phone: '',
    description: 'निष्प्रयोज्य साज सज्जा स्क्रैप, तैयार माल का निस्तारण, चोरी कमी वसूली संबंधी कार्य',
    iconName: 'Trash2',
    colorScheme: 'amber'
  }
];

export { INITIAL_FIELD_UNITS } from './fieldUnitsData';
import { INITIAL_FIELD_UNITS } from './fieldUnitsData';

export const INITIAL_REQUISITIONS: Requisition[] = [
  {
    id: 'req-up-001',
    requisitionNumber: 'DTE-UP/EST-INST/AQ-892/2026',
    title: 'Urgent / समयबद्ध: राजकीय आईटीआई में स्वीकृत व रिक्त Trade Instructor पद एवं जुलाई 2026 Biometric Attendance रिपोर्ट',
    description: 'निदेशालय स्थापना अनुदेशक प्रकोष्ठ द्वारा स्वीकृत नियमित Instructor पदों, Vacancies, Guest Faculty, एवं माह जुलाई 2026 में Trainees की औसत Biometric Attendance % का प्रमाणित डेटा आज शाम तक अनिवार्य रूप से अपेक्षित है।',
    deskId: 'desk-est-inst',
    deskName: 'स्थापना अराजपत्रित(अनुदेशक) व अतिथिवक्ता संबंधी कार्य (Est. Instructors & Guest Faculty Cell)',
    priority: 'URGENT',
    priorityLabel: 'Urgent / Time-bound Report',
    isAssemblyQuestion: true,
    mode: 'CUSTOM_FORM',
    createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    // Strict Deadline: in 4 hours
    deadline: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    isStrictCutoff: true,
    allowLateSubmissionWithReason: false,
    targetScope: 'ALL_FIELD_UNITS',
    targetUnitIds: INITIAL_FIELD_UNITS.map(u => u.id),
    requireOfficerDeclaration: true,
    requireOfficialSealUpload: true,
    orderDocumentName: 'शासनादेश_सं_892_अनुदेशक_रिक्तियां_एवं_बायोमेट्रिक.pdf',
    orderDocumentSize: '412.5 KB',
    orderReferenceNumber: 'शासनादेश सं. 892/2026/88-व्या.शि.',
    orderDate: '2026-08-18',
    status: 'ACTIVE',
    customFields: [
      {
        id: 'sanctioned_posts',
        label: 'संस्थान में स्वीकृत Trade Instructor कुल पद (Sanctioned Posts)',
        type: 'number',
        placeholder: 'उदा. 42',
        required: true,
        helpText: 'शासनादेशानुसार स्वीकृत पद',
        unit: 'स्वीकृत पद'
      },
      {
        id: 'vacant_posts',
        label: 'नियमित Instructors के रिक्त पदों की संख्या (Vacant Posts)',
        type: 'number',
        placeholder: 'उदा. 11',
        required: true,
        unit: 'रिक्त पद'
      },
      {
        id: 'guest_faculty_count',
        label: 'वर्तमान में कार्यरत Guest Faculty / अनुदेशक संख्या',
        type: 'number',
        placeholder: 'उदा. 9',
        required: true,
        unit: 'गेस्ट फैकल्टी'
      },
      {
        id: 'biometric_attendance_pct',
        label: 'माह जुलाई 2026 में Trainees की औसत Biometric Attendance %',
        type: 'number',
        min: 0,
        max: 100,
        placeholder: 'उदा. 86.5',
        required: true,
        unit: 'प्रतिशत %'
      },
      {
        id: 'critical_shortage_trades',
        label: 'सर्वाधिक रिक्तियों वाले प्रमुख Trades (Shortage Trades)',
        type: 'select',
        options: ['इलेक्ट्रीशियन / फिटर (Electrician/Fitter)', 'कोपा / आईओटी (COPA/IoT)', 'मैकेनिक मोटर व्हीकल / डीजल (MMV/Diesel)', 'मशीनिस्ट / टर्नर (Machinist/Turner)', 'पूर्ण स्टाफ उपलब्ध (Fully Staffed)'],
        required: true
      },
      {
        id: 'head_declaration_text',
        label: 'प्रधानाचार्य / संयुक्त निदेशक प्रमाणीकरण (Officer Declaration)',
        type: 'textarea',
        placeholder: 'प्रमाणित किया जाता है कि उपरोक्त आंकड़े दैनिक उपस्थिति पंजिका एवं मानव संपदा पोर्टल से सत्यापित हैं...',
        required: true
      }
    ]
  },
  {
    id: 'req-up-002',
    requisitionNumber: 'DTE-UP/CERT-EXAM/AITT-2026/08-410',
    title: 'AITT अगस्त 2026 Practical Exam व CBT Exam Centre Readiness एवं CCTV Live IP Audit',
    description: 'अखिल भारतीय व्यावसायिक परीक्षा (AITT 2026) एवं SCVT वार्षिक परीक्षाओं हेतु कार्यशाला में Raw Material Kits, 3-Phase Generator Backup, Computer Lab Terminals एवं राज्य नियंत्रण कक्ष हेतु CCTV Live IP Link की पुष्टि।',
    deskId: 'desk-cert-exam',
    deskName: 'राष्ट्रीय व्यवसाय प्रमाण पत्र/SCVT प्रमाण पत्र संबंधी कार्य (NTC / SCVT Certification Section)',
    priority: 'HIGH',
    priorityLabel: 'AITT Exam Centre Report',
    isAssemblyQuestion: false,
    mode: 'HYBRID',
    createdAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 26 * 3600 * 1000).toISOString(),
    isStrictCutoff: true,
    allowLateSubmissionWithReason: true,
    targetScope: 'ALL_ITIS',
    targetUnitIds: INITIAL_FIELD_UNITS.filter(u => u.type === 'ITI').map(u => u.id),
    requireOfficerDeclaration: true,
    requireOfficialSealUpload: true,
    orderDocumentName: 'DGT_AITT_2026_Exam_Guidelines_UP.pdf',
    orderDocumentSize: '1.2 MB',
    orderReferenceNumber: 'शासनादेश सं. 410/SCVT-AITT/2026',
    orderDate: '2026-08-16',
    googleSheetConfig: {
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1UP_DTE_AITT_Exam_Readiness_Master_2026/edit',
      embedAllowed: true,
      sheetInstructions: 'राज्य परीक्षा केंद्र मास्टर गूगल शीट में अपने आईटीआई के टैब में व्यवसाय-वार कच्चा माल उपलब्धता अद्यतन कर पुष्टि लिंक प्रस्तुत करें।',
      expectedColumnsSummary: ['Trade Code', 'Enrolled Candidates', 'Store Material Kit Status', 'Invigilator Roster', 'CCTV Cloud IP Active']
    },
    status: 'ACTIVE',
    customFields: [
      {
        id: 'total_cbt_nodes',
        label: 'CBT ऑनलाइन परीक्षा हेतु कार्यशील Computer Nodes (UPS Backup सहित)',
        type: 'number',
        placeholder: 'उदा. 150',
        required: true,
        unit: 'कंप्यूटर नोड्स'
      },
      {
        id: 'dg_generator_status',
        label: 'DG Generator Set (3-Phase) Load Testing स्थिति',
        type: 'radio',
        options: ['पूर्णतः कार्यशील (Fully Operational)', 'आंशिक रूप से कार्यशील (Minor Maintenance)', 'खराब / तत्काल मरम्मत अपेक्षित (Defective)'],
        required: true
      },
      {
        id: 'cctv_cloud_ready',
        label: 'क्या State Exam Control Room हेतु CCTV Live IP Feed चालू है?',
        type: 'radio',
        options: ['हाँ - IP Feed सत्यापित एवं चालू (Verified Live)', 'नहीं - केवल Local DVR Recording (Local Only)', 'कॉन्फ़िगरेशन प्रक्रियाधीन (In Progress)'],
        required: true
      },
      {
        id: 'workshop_store_incharge',
        label: 'नामित परीक्षा कार्यशाला Store In-charge का नाम एवं मोबाइल नंबर',
        type: 'text',
        placeholder: 'उदा. श्री राकेश कुमार, कार्यदेशक (+91 94150 12345)',
        required: true
      }
    ]
  },
  {
    id: 'req-up-003',
    requisitionNumber: 'DTE-UP/UPG-1000/INFRA-2026/03',
    title: 'Upgradation of 1000 ITI एवं CoE कार्यशाला निर्माण व Equipment Installation प्रगति रिपोर्ट',
    description: 'उत्तर प्रदेश सरकार एवं Tata Technologies Limited के संयुक्त तत्वावधान में 1000 आईटीआई आधुनिकीकरण परियोजना, 5-Axis CNC Machinery, Industrial Robotics एवं Electric Vehicle (EV) Workshop स्थापना स्थिति।',
    deskId: 'desk-upgrade-1000',
    deskName: 'Upgradation of 1000 ITI संबंधी कार्य (Upgradation of 1000 ITIs Cell)',
    priority: 'HIGH',
    priorityLabel: 'Upgradation 1000 ITI Progress Report',
    isAssemblyQuestion: false,
    mode: 'CUSTOM_FORM',
    createdAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 68 * 3600 * 1000).toISOString(),
    isStrictCutoff: false,
    allowLateSubmissionWithReason: true,
    targetScope: 'ALL_FIELD_UNITS',
    targetUnitIds: INITIAL_FIELD_UNITS.map(u => u.id),
    requireOfficerDeclaration: true,
    requireOfficialSealUpload: true,
    orderDocumentName: 'UP_Govt_TTL_1000_ITI_Upgradation_Order.pdf',
    orderDocumentSize: '2.4 MB',
    orderReferenceNumber: 'शासनादेश सं. 1000/टाटा-आईआईटी/2026',
    orderDate: '2026-08-10',
    status: 'ACTIVE',
    customFields: [
      {
        id: 'civil_hall_status',
        label: 'आधुनिक Workshop Shed निर्माण स्थिति',
        type: 'select',
        options: ['100% पूर्ण एवं हैंडओवर (Handed Over)', '80-99% फिनिशिंग कार्य जारी (Finishing Stage)', '50-79% निर्माण प्रगति पर (Under Construction)', 'भूमि आवंटन / टेंडर स्तर (Tender Stage)'],
        required: true
      },
      {
        id: 'machinery_installed_count',
        label: 'Installed & Active उन्नत मशीनरी / सिमुलेटर संख्या',
        type: 'number',
        placeholder: 'उदा. 14',
        required: true,
        unit: 'मशीनरी इकाइयां'
      },
      {
        id: 'master_trainers_certified',
        label: 'प्रशिक्षित एवं प्रमाणित Master Trainer संख्या',
        type: 'number',
        placeholder: 'उदा. 6',
        required: true,
        unit: 'प्रमाणित अनुदेशक'
      },
      {
        id: 'power_load_sanctioned_kva',
        label: 'विद्युत विभाग (UPPCL) द्वारा स्वीकृत Industrial Power Load (kVA)',
        type: 'number',
        placeholder: 'उदा. 125',
        required: true,
        unit: 'kVA'
      }
    ]
  },
  {
    id: 'req-up-004',
    requisitionNumber: 'DTE-UP/APPR/CMAPS-2026/04',
    title: 'मुख्यमंत्री शिक्षुता प्रोत्साहन योजना (CMAPS) एवं NAPS Apprenticeship Contract डेटा (Google Sheet Return)',
    description: 'सत्र 2025-26 के उत्तीर्ण परीक्षार्थियों हेतु Industrial Units में Apprenticeship Contract, Direct Benefit Transfer (DBT) Stipend भुगतान स्थिति एवं उद्योगवार विवरण।',
    deskId: 'desk-appr',
    deskName: 'शिक्षुता अनुभाग (Apprenticeship Section)',
    priority: 'NORMAL',
    priorityLabel: 'Monthly Apprenticeship Report',
    isAssemblyQuestion: false,
    mode: 'GOOGLE_SHEET',
    createdAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 110 * 3600 * 1000).toISOString(),
    isStrictCutoff: false,
    allowLateSubmissionWithReason: true,
    targetScope: 'ALL_ITIS',
    targetUnitIds: INITIAL_FIELD_UNITS.filter(u => u.type === 'ITI').map(u => u.id),
    requireOfficerDeclaration: true,
    requireOfficialSealUpload: false,
    googleSheetConfig: {
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1UP_CMAPS_NAPS_Master_Tracker_DTE_UP/edit',
      embedAllowed: true,
      sheetInstructions: 'राज्य शिक्षुता गूगल स्प्रेडशीट में अपने संस्थान के टैब में शिक्षु का रोल नंबर, प्रतिष्ठान का नाम, एवं अनुबंध संख्या दर्ज कर लिंक सबमिट करें।',
      expectedColumnsSummary: ['Trainee Roll', 'Trade', 'Industry Partner Name', 'Stipend DBT Status', 'Apprenticeship Portal ID']
    },
    status: 'ACTIVE'
  },
  {
    id: 'req-up-005',
    requisitionNumber: 'DTE-UP/BLDG/SAFETY-2026/01',
    title: 'Monsoon Safety Audit: संस्थान भवनों का जलभराव, Electrical Earthing एवं सुरक्षा निरीक्षण Check',
    description: 'भारी वर्षा के दृष्टिगत कार्यशाला शेड की लीकेज जांच, Transformer Earthing Resistance (<5 Ohms), एवं Fire Extinguishers की वैधता का अनिवार्य सुरक्षा ऑडिट।',
    deskId: 'desk-bldg',
    deskName: 'भवन संबंधी कार्य (Building & Infrastructure Cell)',
    priority: 'ROUTINE',
    priorityLabel: 'Monsoon Safety Audit',
    isAssemblyQuestion: false,
    mode: 'CUSTOM_FORM',
    createdAt: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
    deadline: new Date(Date.now() + 160 * 3600 * 1000).toISOString(),
    isStrictCutoff: false,
    allowLateSubmissionWithReason: true,
    targetScope: 'ALL_FIELD_UNITS',
    targetUnitIds: INITIAL_FIELD_UNITS.map(u => u.id),
    requireOfficerDeclaration: false,
    requireOfficialSealUpload: false,
    status: 'ACTIVE',
    customFields: [
      {
        id: 'earthing_resistance_tested',
        label: 'Workshop Main Switchboard एवं Transformer Earthing Resistance Test (< 5 Ohms)?',
        type: 'radio',
        options: ['हाँ - विद्युत सुरक्षा निदेशालय द्वारा प्रमाणित (Verified)', 'परीक्षण प्रक्रियाधीन (In Progress)', 'दोषपूर्ण - तत्काल सुधार आवश्यक (Defective)'],
        required: true
      },
      {
        id: 'roof_seepage_risk',
        label: 'Computer Lab अथवा Machine Hall की छत से जलभराव / Seepage Risk?',
        type: 'select',
        options: ['शून्य / पूर्णतः सुरक्षित (Nil / Safe)', 'आंशिक सीलन - तिरपाल/मरम्मत व्यवस्था (Minor)', 'गंभीर रिसाव - विद्युत खतरा (Hazardous)'],
        required: true
      },
      {
        id: 'fire_extinguisher_valid',
        label: 'संस्थान में कार्यशील एवं वैध अग्निशामक सिलेंडरों की संख्या',
        type: 'number',
        placeholder: 'उदा. 24',
        required: true,
        unit: 'सिलेंडर'
      }
    ]
  }
];

export const INITIAL_SUBMISSIONS: SubmissionRecord[] = [
  // Submissions for req-up-001 (Admin Urgent Question)
  {
    id: 'sub-up-001-aliganj',
    requisitionId: 'req-up-001',
    fieldUnitId: 'iti-081',
    fieldUnitName: 'Government ITI, Aliganj, Lucknow [081]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Lucknow',
    fieldUnitDistrict: 'Lucknow',
    submittedAt: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी) एवं नोडल अधिकारी',
    officerContact: '+91 522 232 7101',
    status: 'APPROVED',
    isLate: false,
    data: {
      sanctioned_posts: 56,
      vacant_posts: 12,
      guest_faculty_count: 12,
      biometric_attendance_pct: 92.4,
      critical_shortage_trades: 'मैकेनिक मोटर व्हीकल / डीजल (MMV/Diesel)',
      head_declaration_text: 'प्रमाणित किया जाता है कि 12 रिक्त पदों के सापेक्ष 12 गेस्ट फैकल्टी कार्यरत हैं तथा सभी प्रशिक्षार्थियों का बायोमेट्रिक विवरण राज्य सर्वर से समक्रमिक है।'
    },
    uploadedDocumentName: 'Signed_Principal_Seal_Aliganj_Lucknow.pdf',
    uploadedDocumentUrl: '#',
    deskReviewedAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    deskReviewedBy: '',
    deskComments: 'सत्यापित एवं प्रशासनिक पत्रावली में सम्मिलित।'
  },
  {
    id: 'sub-up-001-womenlko',
    requisitionId: 'req-up-001',
    fieldUnitId: 'iti-082',
    fieldUnitName: 'Government ITI, Charbagh, Lucknow [082]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Lucknow',
    fieldUnitDistrict: 'Lucknow',
    submittedAt: new Date(Date.now() - 2.8 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी)',
    officerContact: '+91 522 263 8102',
    status: 'APPROVED',
    isLate: false,
    data: {
      sanctioned_posts: 28,
      vacant_posts: 4,
      guest_faculty_count: 4,
      biometric_attendance_pct: 94.8,
      critical_shortage_trades: 'कोपा / आईओटी (COPA/IoT)',
      head_declaration_text: 'जुलाई 2026 माह में महिला प्रशिक्षार्थियों की बायोमेट्रिक उपस्थिति 94.8% दर्ज की गई।'
    },
    uploadedDocumentName: 'WomenITI_Charbagh_Certified_Return.pdf',
    uploadedDocumentUrl: '#'
  },
  {
    id: 'sub-up-001-kanpur',
    requisitionId: 'req-up-001',
    fieldUnitId: 'iti-071',
    fieldUnitName: 'Government ITI, Pandu Nagar, Kanpur Nagar [071]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Kanpur',
    fieldUnitDistrict: 'Kanpur Nagar',
    submittedAt: new Date(Date.now() - 1.8 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी)',
    officerContact: '+91 512 229 2201',
    status: 'UNDER_REVIEW',
    isLate: false,
    data: {
      sanctioned_posts: 48,
      vacant_posts: 14,
      guest_faculty_count: 11,
      biometric_attendance_pct: 85.2,
      critical_shortage_trades: 'इलेक्ट्रीशियन / फिटर (Electrician/Fitter)',
      head_declaration_text: 'कानपुर औद्योगिक कॉरिडोर हेतु 3 अतिरिक्त सीएनसी अनुदेशक की मांग प्रेषित की गई है।'
    },
    uploadedDocumentName: 'ITI_PanduNagar_Kanpur_Seal.pdf',
    uploadedDocumentUrl: '#'
  },
  {
    id: 'sub-up-001-jdlko',
    requisitionId: 'req-up-001',
    fieldUnitId: 'jd-lko',
    fieldUnitName: 'संयुक्त निदेशक क्षेत्रीय कार्यालय (लखनऊ मंडल / Lucknow Division)',
    fieldUnitType: 'JD_OFFICE',
    fieldUnitZone: 'Lucknow',
    fieldUnitDistrict: 'Lucknow',
    submittedAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'संयुक्त निदेशक (क्षेत्रीय)',
    officerContact: '+91 522 243 1001',
    status: 'APPROVED',
    isLate: false,
    data: {
      sanctioned_posts: 180,
      vacant_posts: 38,
      guest_faculty_count: 35,
      biometric_attendance_pct: 89.1,
      critical_shortage_trades: 'मशीनिस्ट / टर्नर (Machinist/Turner)',
      head_declaration_text: 'लखनऊ परिक्षेत्र के समस्त राजकीय आईटीआई का समेकित विवरण सत्यापित कर प्रेषित है।'
    },
    uploadedDocumentName: 'JD_Lucknow_Division_Consolidated.pdf',
    uploadedDocumentUrl: '#'
  },
  {
    id: 'sub-up-001-saketmrt',
    requisitionId: 'req-up-001',
    fieldUnitId: 'iti-101',
    fieldUnitName: 'Government ITI, Saket, Meerut [101]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Meerut',
    fieldUnitDistrict: 'Meerut',
    submittedAt: new Date(Date.now() - 0.4 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी)',
    officerContact: '+91 121 264 4401',
    status: 'REVISION_REQUESTED',
    isLate: false,
    data: {
      sanctioned_posts: 40,
      vacant_posts: 18,
      guest_faculty_count: 8,
      biometric_attendance_pct: 64.2,
      critical_shortage_trades: 'कोपा / आईओटी (COPA/IoT)',
      head_declaration_text: 'बायोमेट्रिक सर्वर नेटवर्क केबल कार्य के कारण कुछ दिन उपस्थिति बाधित रही।'
    },
    uploadedDocumentName: 'ITI_Meerut_Draft_Report.pdf',
    uploadedDocumentUrl: '#',
    deskReviewedAt: new Date(Date.now() - 0.2 * 3600 * 1000).toISOString(),
    deskReviewedBy: '',
    deskComments: 'बायोमेट्रिक उपस्थिति 64.2% असामान्य रूप से कम है। कृपया BSNL नेटवर्क फॉल्ट टोकन एवं पुनर्सत्यापित विवरण प्रेषित करें।',
    revisionNotes: 'कृपया बायोमेट्रिक मशीन अपटाइम सर्टिफिकेट के साथ पुनः सबमिट करें।'
  },

  // Submissions for req-up-002 (Exam readiness)
  {
    id: 'sub-up-002-aliganj',
    requisitionId: 'req-up-002',
    fieldUnitId: 'iti-081',
    fieldUnitName: 'Government ITI, Aliganj, Lucknow [081]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Lucknow',
    fieldUnitDistrict: 'Lucknow',
    submittedAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी) एवं नोडल अधिकारी',
    officerContact: '+91 522 232 7101',
    status: 'APPROVED',
    isLate: false,
    data: {
      total_cbt_nodes: 240,
      dg_generator_status: 'पूर्णतः कार्यशील (Fully Operational)',
      cctv_cloud_ready: 'हाँ - IP फीड सत्यापित एवं चालू (Verified Live)',
      workshop_store_incharge: 'कार्यदेशक / स्टोर अधिकारी'
    },
    googleSheetSubmittedUrl: 'https://docs.google.com/spreadsheets/d/1UP_DTE_AITT_Exam_Readiness_Master_2026/edit#gid=101',
    uploadedDocumentName: 'AITT_Exam_Center_Readiness_Aliganj_LKO.pdf',
    uploadedDocumentUrl: '#'
  },
  {
    id: 'sub-up-002-karaundi',
    requisitionId: 'req-up-002',
    fieldUnitId: 'iti-121',
    fieldUnitName: 'Government ITI, Karaundi, Varanasi [121]',
    fieldUnitType: 'ITI',
    fieldUnitZone: 'Varanasi',
    fieldUnitDistrict: 'Varanasi',
    submittedAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    submittedByOfficer: '',
    officerDesignation: 'प्रधानाचार्य (प्रथम श्रेणी)',
    officerContact: '+91 542 257 3301',
    status: 'APPROVED',
    isLate: false,
    data: {
      total_cbt_nodes: 180,
      dg_generator_status: 'पूर्णतः कार्यशील (Fully Operational)',
      cctv_cloud_ready: 'हाँ - IP फीड सत्यापित एवं चालू (Verified Live)',
      workshop_store_incharge: 'स्टोर अधिकारी'
    },
    googleSheetSubmittedUrl: 'https://docs.google.com/spreadsheets/d/1UP_DTE_AITT_Exam_Readiness_Master_2026/edit#gid=301',
    uploadedDocumentName: 'Varanasi_AITT_Raw_Material_Signed.pdf',
    uploadedDocumentUrl: '#'
  }
];

export const INITIAL_EXTENSION_REQUESTS: ExtensionRequest[] = [
  {
    id: 'ext-up-001',
    requisitionId: 'req-up-001',
    fieldUnitId: 'iti-051',
    fieldUnitName: 'Government ITI, Jhansi [051]',
    requestedDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    reason: 'बुंदेलखंड क्षेत्र में भारी वर्षा एवं ट्रांसफार्मर ट्रिपिंग के कारण सर्वर रूम जनरेटर बैकअप पर है; डेटा संकलन जारी है।',
    status: 'PENDING',
    createdAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString()
  },
  {
    id: 'ext-up-002',
    requisitionId: 'req-up-003',
    fieldUnitId: 'iti-109',
    fieldUnitName: 'Government ITI, Naini, Prayagraj [109]',
    requestedDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    reason: 'टाटा टेक्नोलॉजीज के इंजीनियरों द्वारा 5-एक्सिस सीएनसी मशीनरी का संयुक्त लोड निरीक्षण कल निर्धारित है।',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
    respondedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    deskResponseComment: '48 घंटे की समय-वृद्धि स्वीकृत की गई। संयुक्त निरीक्षण रिपोर्ट संलग्न करना अनिवार्य है।'
  }
];
