export const SUPPORT_EMAIL = 'support@79ai.net';

export type LegalPageType = 'privacy' | 'terms';

export interface LegalBulletItem {
  title: string;
  text: string;
}

export interface LegalSection {
  id: string;
  title: string;
  items: LegalBulletItem[];
}

export interface LegalComplianceBlock {
  badge: string;
  heading: string;
  warning: string;
  items: string[];
}

export interface LegalPageContent {
  title: string;
  intro: string;
  sections: LegalSection[];
  compliance?: LegalComplianceBlock;
  contactLabel: string;
  crossNav: { label: string; href: string };
}

const privacyEn: LegalPageContent = {
  title: 'Privacy Policy',
  intro:
    'At AI Gateway, we value your privacy. This policy explains how we collect, use, and protect your personal information when you use our generative AI platform.',
  sections: [
    {
      id: 'collect',
      title: '1. Data We Collect',
      items: [
        {
          title: 'Account Information',
          text: 'Name, email, avatar when you login via Google or other methods.',
        },
        {
          title: 'Usage Data',
          text: 'Prompts, images, videos, and audio you generate on the platform.',
        },
        {
          title: 'Technical Information',
          text: 'IP address, browser type, and access logs to ensure system security.',
        },
      ],
    },
    {
      id: 'use',
      title: '2. How We Use Data',
      items: [
        {
          title: 'Service Provision',
          text: 'Processing your AI content generation requests.',
        },
        {
          title: 'Experience Improvement',
          text: 'Analyzing errors and optimizing model performance.',
        },
        {
          title: 'Communication',
          text: 'Sending notifications about service updates or important changes.',
        },
      ],
    },
    {
      id: 'security',
      title: '3. Data Security',
      items: [
        { title: '', text: 'We use SSL/TLS encryption for all data transmission.' },
        { title: '', text: 'Your data is never sold to third parties.' },
        {
          title: '',
          text: 'We do not use your private data to train public AI models without consent.',
        },
      ],
    },
    {
      id: 'third-party',
      title: '4. Third-Party Services',
      items: [
        {
          title: '',
          text:
            'The system may use APIs from Google (Gemini), OpenAI, or other providers to process requests. Outbound data includes only content necessary for generation.',
        },
      ],
    },
  ],
  contactLabel: 'Contact support',
  crossNav: { label: 'Terms of Service', href: '/terms/' },
};

const privacyVi: LegalPageContent = {
  title: 'Chính sách quyền riêng tư',
  intro:
    'AI Gateway coi trọng quyền riêng tư của bạn. Chính sách này giải thích cách chúng tôi thu thập, sử dụng và bảo vệ thông tin cá nhân khi bạn dùng nền tảng AI tạo sinh.',
  sections: [
    {
      id: 'collect',
      title: '1. Dữ liệu chúng tôi thu thập',
      items: [
        {
          title: 'Thông tin tài khoản',
          text: 'Tên, email, avatar khi đăng nhập qua Google hoặc phương thức khác.',
        },
        {
          title: 'Dữ liệu sử dụng',
          text: 'Prompt, ảnh, video và audio bạn tạo trên nền tảng.',
        },
        {
          title: 'Thông tin kỹ thuật',
          text: 'IP, loại trình duyệt và log truy cập để đảm bảo an toàn hệ thống.',
        },
      ],
    },
    {
      id: 'use',
      title: '2. Cách chúng tôi dùng dữ liệu',
      items: [
        { title: 'Cung cấp dịch vụ', text: 'Xử lý yêu cầu tạo nội dung AI của bạn.' },
        {
          title: 'Cải thiện trải nghiệm',
          text: 'Phân tích lỗi và tối ưu hiệu năng model.',
        },
        {
          title: 'Liên lạc',
          text: 'Gửi thông báo về cập nhật dịch vụ hoặc thay đổi quan trọng.',
        },
      ],
    },
    {
      id: 'security',
      title: '3. Bảo mật dữ liệu',
      items: [
        { title: '', text: 'Mã hóa SSL/TLS cho toàn bộ truyền tải dữ liệu.' },
        { title: '', text: 'Không bán dữ liệu cho bên thứ ba.' },
        {
          title: '',
          text: 'Không dùng dữ liệu riêng tư để train model AI công cộng nếu không có sự đồng ý.',
        },
      ],
    },
    {
      id: 'third-party',
      title: '4. Dịch vụ bên thứ ba',
      items: [
        {
          title: '',
          text:
            'Hệ thống có thể dùng API từ Google (Gemini), OpenAI hoặc nhà cung cấp khác. Dữ liệu gửi ra chỉ gồm nội dung cần thiết cho việc tạo sinh.',
        },
      ],
    },
  ],
  contactLabel: 'Liên hệ hỗ trợ',
  crossNav: { label: 'Điều khoản dịch vụ', href: '/vi/terms/' },
};

const termsEn: LegalPageContent = {
  title: 'Terms of Service',
  intro:
    'Welcome to AI Gateway. By accessing and using our services, you agree to comply with the following terms and conditions.',
  compliance: {
    badge: 'MOST IMPORTANT TERMS',
    heading: 'LOCAL LAW COMPLIANCE',
    warning: 'IMPORTANT: Please read this section carefully before using the service.',
    items: [
      'By using AI Gateway, you agree to comply with all applicable laws and regulations in the country or jurisdiction where you reside.',
      'You are solely responsible for ensuring that your use of the service complies with local laws, including but not limited to laws regarding digital content, privacy, intellectual property, and cyber security.',
      'If the laws in your country prohibit or restrict the use of generative AI services, you are NOT permitted to use our services.',
      'AI Gateway is NOT liable for any legal consequences arising from your violation of local laws while using the service.',
      'You commit not to use the service to create any content that violates the laws of any country in the world.',
    ],
  },
  sections: [
    {
      id: 'accounts',
      title: '2. User Accounts',
      items: [
        {
          title: '',
          text:
            'You are responsible for maintaining the security of your login credentials. You must be at least 13 years old to use the service. We reserve the right to suspend accounts if violations are detected.',
        },
      ],
    },
    {
      id: 'ip',
      title: '3. Intellectual Property',
      items: [
        {
          title: '',
          text:
            'You retain ownership of the content you generate (unless otherwise required by law). However, you grant AI Gateway a license to use such content to operate and improve the service.',
        },
      ],
    },
    {
      id: 'conduct',
      title: '4. Prohibited Conduct',
      items: [
        {
          title: '',
          text:
            'It is strictly prohibited to use AI Gateway to generate obscene, violent, hateful content, fake news (harmful disinformation), or copyright infringement. Any violation will result in immediate termination of service.',
        },
      ],
    },
    {
      id: 'liability',
      title: '5. Limitation of Liability',
      items: [
        {
          title: '',
          text:
            'The service is provided "as is". We do not guarantee that AI outputs will always be accurate or error-free. We are not liable for any damages arising from the use of the service.',
        },
      ],
    },
  ],
  contactLabel: 'Contact support',
  crossNav: { label: 'Privacy Policy', href: '/privacy-policy/' },
};

const termsVi: LegalPageContent = {
  title: 'Điều khoản dịch vụ',
  intro:
    'Chào mừng bạn đến AI Gateway. Khi truy cập và sử dụng dịch vụ, bạn đồng ý tuân thủ các điều khoản sau.',
  compliance: {
    badge: 'ĐIỀU KHOẢN QUAN TRỌNG NHẤT',
    heading: 'TUÂN THỦ PHÁP LUẬT ĐỊA PHƯƠNG',
    warning: 'QUAN TRỌNG: Đọc kỹ phần này trước khi dùng dịch vụ.',
    items: [
      'Khi dùng AI Gateway, bạn đồng ý tuân thủ luật pháp tại quốc gia hoặc khu vực bạn cư trú.',
      'Bạn chịu trách nhiệm đảm bảo việc dùng dịch vụ tuân thủ luật địa phương (nội dung số, quyền riêng tư, sở hữu trí tuệ, an ninh mạng…).',
      'Nếu luật quốc gia bạn cấm hoặc hạn chế dịch vụ AI tạo sinh, bạn KHÔNG được dùng dịch vụ.',
      'AI Gateway KHÔNG chịu trách nhiệm pháp lý do bạn vi phạm luật địa phương khi dùng dịch vụ.',
      'Bạn cam kết không dùng dịch vụ để tạo nội dung vi phạm luật của bất kỳ quốc gia.',
    ],
  },
  sections: [
    {
      id: 'accounts',
      title: '2. Tài khoản người dùng',
      items: [
        {
          title: '',
          text:
            'Bạn chịu trách nhiệm bảo mật thông tin đăng nhập. Bạn phải từ 13 tuổi trở lên. Chúng tôi có quyền khóa tài khoản khi phát hiện vi phạm.',
        },
      ],
    },
    {
      id: 'ip',
      title: '3. Sở hữu trí tuệ',
      items: [
        {
          title: '',
          text:
            'Bạn giữ quyền sở hữu nội dung tạo ra (trừ khi luật yêu cầu khác). Bạn cấp cho AI Gateway quyền sử dụng nội dung đó để vận hành và cải thiện dịch vụ.',
        },
      ],
    },
    {
      id: 'conduct',
      title: '4. Hành vi bị cấm',
      items: [
        {
          title: '',
          text:
            'Cấm dùng AI Gateway để tạo nội dung khiêu dâm, bạo lực, thù hận, tin giả gây hại, hoặc vi phạm bản quyền. Vi phạm sẽ bị chấm dứt dịch vụ ngay.',
        },
      ],
    },
    {
      id: 'liability',
      title: '5. Giới hạn trách nhiệm',
      items: [
        {
          title: '',
          text:
            'Dịch vụ cung cấp "nguyên trạng". Chúng tôi không đảm bảo kết quả AI luôn chính xác. Không chịu trách nhiệm thiệt hại phát sinh từ việc dùng dịch vụ.',
        },
      ],
    },
  ],
  contactLabel: 'Liên hệ hỗ trợ',
  crossNav: { label: 'Chính sách quyền riêng tư', href: '/vi/privacy-policy/' },
};

const privacyTh: LegalPageContent = {
  title: 'นโยบายความเป็นส่วนตัว',
  intro:
    'AI Gateway ให้ความสำคัญกับความเป็นส่วนตัวของคุณ นโยบายนี้อธิบายว่าเรารวบรวม ใช้ และปกป้องข้อมูลส่วนบุคคลเมื่อคุณใช้แพลตฟอร์ม AI สร้างสรรค์ของเรา',
  sections: [
    {
      id: 'collect',
      title: '1. ข้อมูลที่เรารวบรวม',
      items: [
        {
          title: 'ข้อมูลบัญชี',
          text: 'ชื่อ อีเมล และรูปโปรไฟล์เมื่อคุณเข้าสู่ระบบผ่าน Google หรือวิธีอื่น',
        },
        {
          title: 'ข้อมูลการใช้งาน',
          text: 'พรอมต์ รูปภาพ วิดีโอ และเสียงที่คุณสร้างบนแพลตฟอร์ม',
        },
        {
          title: 'ข้อมูลทางเทคนิค',
          text: 'ที่อยู่ IP ประเภทเบราว์เซอร์ และบันทึกการเข้าถึงเพื่อความปลอดภัยของระบบ',
        },
      ],
    },
    {
      id: 'use',
      title: '2. การใช้ข้อมูล',
      items: [
        {
          title: 'การให้บริการ',
          text: 'ประมวลผลคำขอสร้างเนื้อหา AI ของคุณ',
        },
        {
          title: 'ปรับปรุงประสบการณ์',
          text: 'วิเคราะห์ข้อผิดพลาดและเพิ่มประสิทธิภาพโมเดล',
        },
        {
          title: 'การสื่อสาร',
          text: 'ส่งการแจ้งเตือนเกี่ยวกับการอัปเดตบริการหรือการเปลี่ยนแปลงที่สำคัญ',
        },
      ],
    },
    {
      id: 'security',
      title: '3. ความปลอดภัยของข้อมูล',
      items: [
        { title: '', text: 'เราใช้การเข้ารหัส SSL/TLS สำหรับการส่งข้อมูลทั้งหมด' },
        { title: '', text: 'เราไม่ขายข้อมูลของคุณให้บุคคลที่สาม' },
        {
          title: '',
          text: 'เราไม่ใช้ข้อมูลส่วนตัวของคุณเพื่อฝึกโมเดล AI สาธารณะโดยไม่ได้รับความยินยอม',
        },
      ],
    },
    {
      id: 'third-party',
      title: '4. บริการของบุคคลที่สาม',
      items: [
        {
          title: '',
          text:
            'ระบบอาจใช้ API จาก Google (Gemini) OpenAI หรือผู้ให้บริการอื่นเพื่อประมวลผลคำขอ ข้อมูลที่ส่งออกมีเฉพาะเนื้อหาที่จำเป็นสำหรับการสร้าง',
        },
      ],
    },
  ],
  contactLabel: 'ติดต่อฝ่ายสนับสนุน',
  crossNav: { label: 'ข้อกำหนดการให้บริการ', href: '/th/terms/' },
};

const termsTh: LegalPageContent = {
  title: 'ข้อกำหนดการให้บริการ',
  intro:
    'ยินดีต้อนรับสู่ AI Gateway การเข้าถึงและใช้บริการของเราแสดงว่าคุณยอมรับข้อกำหนดและเงื่อนไขต่อไปนี้',
  compliance: {
    badge: 'ข้อกำหนดที่สำคัญที่สุด',
    heading: 'การปฏิบัติตามกฎหมายท้องถิ่น',
    warning: 'สำคัญ: โปรดอ่านส่วนนี้อย่างละเอียดก่อนใช้บริการ',
    items: [
      'การใช้ AI Gateway แสดงว่าคุณยอมรับกฎหมายและข้อบังคับที่ใช้บังคับในประเทศหรือเขตพื้นที่ที่คุณอาศัยอยู่',
      'คุณมีหน้าที่รับผิดชอบแต่เพียงผู้เดียวในการให้แน่ใจว่าการใช้บริการของคุณเป็นไปตามกฎหมายท้องถิ่น รวมถึงกฎหมายเกี่ยวกับเนื้อหาดิจิทัล ความเป็นส่วนตัว ทรัพย์สินทางปัญญา และความมั่นคงปลอดภัยทางไซเบอร์',
      'หากกฎหมายในประเทศของคุณห้ามหรือจำกัดบริการ AI สร้างสรรค์ คุณไม่ได้รับอนุญาตให้ใช้บริการของเรา',
      'AI Gateway ไม่รับผิดชอบต่อผลทางกฎหมายใด ๆ ที่เกิดจากการละเมิดกฎหมายท้องถิ่นของคุณขณะใช้บริการ',
      'คุณตกลงที่จะไม่ใช้บริการเพื่อสร้างเนื้อหาใด ๆ ที่ละเมิดกฎหมายของประเทศใด ๆ ในโลก',
    ],
  },
  sections: [
    {
      id: 'accounts',
      title: '2. บัญชีผู้ใช้',
      items: [
        {
          title: '',
          text:
            'คุณมีหน้าที่รักษาความปลอดภัยของข้อมูลเข้าสู่ระบบ คุณต้องมีอายุอย่างน้อย 13 ปีจึงจะใช้บริการได้ เราขอสงวนสิทธิ์ระงับบัญชีหากพบการละเมิด',
        },
      ],
    },
    {
      id: 'ip',
      title: '3. ทรัพย์สินทางปัญญา',
      items: [
        {
          title: '',
          text:
            'คุณยังคงเป็นเจ้าของเนื้อหาที่คุณสร้าง (เว้นแต่กฎหมายกำหนดเป็นอย่างอื่น) อย่างไรก็ตาม คุณมอบสิทธิ์ให้ AI Gateway ใช้เนื้อหานั้นเพื่อดำเนินการและปรับปรุงบริการ',
        },
      ],
    },
    {
      id: 'conduct',
      title: '4. พฤติกรรมที่ห้าม',
      items: [
        {
          title: '',
          text:
            'ห้ามใช้ AI Gateway สร้างเนื้อหาลามก รุนแรง แสดงความเกลียดชัง ข่าวปลอมที่เป็นอันตราย หรือละเมิดลิขสิทธิ์ การละเมิดจะถูกยกเลิกบริการทันที',
        },
      ],
    },
    {
      id: 'liability',
      title: '5. ข้อจำกัดความรับผิด',
      items: [
        {
          title: '',
          text:
            'บริการมีให้ "ตามสภาพ" เราไม่รับประกันว่าผลลัพธ์จาก AI จะถูกต้องหรือไม่มีข้อผิดพลาดเสมอไป เราไม่รับผิดชอบต่อความเสียหายใด ๆ ที่เกิดจากการใช้บริการ',
        },
      ],
    },
  ],
  contactLabel: 'ติดต่อฝ่ายสนับสนุน',
  crossNav: { label: 'นโยบายความเป็นส่วนตัว', href: '/th/privacy-policy/' },
};

export type LegalLocale = 'en' | 'vi' | 'th';

export function getLegalContent(type: LegalPageType, locale: LegalLocale | boolean): LegalPageContent {
  const loc =
    typeof locale === 'boolean' ? (locale ? 'vi' : 'en') : locale;
  if (type === 'privacy') {
    if (loc === 'vi') return privacyVi;
    if (loc === 'th') return privacyTh;
    return privacyEn;
  }
  if (loc === 'vi') return termsVi;
  if (loc === 'th') return termsTh;
  return termsEn;
}
