import { Document, Packer, Paragraph, TextRun } from 'docx';
import PDFDocument from 'pdfkit';

// COMPLETE REWRITE - New function names to bypass any caching
const getAllTemplates = async () => {
  return [
    {
      id: 'labor_contract_basic',
      name: 'Hợp đồng lao động cơ bản',
      category: 'Hợp đồng lao động',
      icon: '📄',
      description: 'Mẫu hợp đồng lao động với điều khoản cốt lõi theo Bộ luật Lao động.',
      required_fields: ['company_name', 'employee_name', 'position', 'salary', 'work_location', 'start_date'],
      sections: ['Thông tin các bên', 'Vị trí và phạm vi công việc', 'Thời hạn hợp đồng', 'Lương và phụ cấp', 'Thời giờ làm việc, nghỉ ngơi', 'Bảo mật và xử lý vi phạm', 'Điều khoản chấm dứt'],
    },
    {
      id: 'service_contract_basic',
      name: 'Hợp đồng dịch vụ cơ bản',
      category: 'Hợp đồng dịch vụ',
      icon: '📄',
      description: 'Mẫu hợp đồng dịch vụ B2B chuẩn với điều khoản nghiệm thu và thanh toán.',
      required_fields: ['client_name', 'vendor_name', 'service_scope', 'fee', 'payment_terms', 'effective_date'],
      sections: ['Đối tượng dịch vụ', 'Tiến độ thực hiện', 'Phí và phương thức thanh toán', 'Nghiệm thu và bàn giao', 'Bảo mật thông tin', 'Giải quyết tranh chấp'],
    },
    {
      id: 'official_notice',
      name: 'Thông báo nội bộ',
      category: 'Thông báo',
      icon: '📌',
      description: 'Mẫu thông báo nội bộ cho doanh nghiệp.',
      required_fields: ['issuer_name', 'notice_subject', 'notice_body', 'issue_date'],
      sections: ['Tiêu đề và căn cứ ban hành', 'Nội dung thông báo', 'Hiệu lực áp dụng', 'Nơi nhận'],
    },
    {
      id: 'official_letter',
      name: 'Công văn',
      category: 'Công văn',
      icon: '📄',
      description: 'Mẫu công văn chính thức gửi đến cơ quan, tổ chức khác.',
      required_fields: ['sender_department', 'recipient_name', 'subject', 'content', 'issue_date', 'sender_name'],
      sections: ['Thông tin người gửi', 'Thông tin người nhận', 'Tiêu đề công văn', 'Nội dung', 'Thông tin liên lạc', 'Chữ ký'],
    },
    {
      id: 'decision_document',
      name: 'Quyết định',
      category: 'Quyết định',
      icon: '⚖️',
      description: 'Mẫu quyết định ban hành nội bộ công ty.',
      required_fields: ['issuer_position', 'issuer_name', 'decision_title', 'decision_content', 'effective_date', 'announcement_date'],
      sections: ['Căn cứ pháp lý', 'Nội dung quyết định', 'Trách nhiệm thực hiện', 'Hiệu lực áp dụng', 'Ký duyệt'],
    },
    {
      id: 'appointment_decision',
      name: 'Quyết định bổ nhiệm',
      category: 'Quyết định',
      icon: '📋',
      description: 'Quyết định bổ nhiệm nhân viên vào chức vụ mới.',
      required_fields: ['employee_name', 'old_position', 'new_position', 'appointment_date', 'issuer_name', 'company_name'],
      sections: ['Thông tin nhân viên', 'Chức vụ mới', 'Hiệu lực bổ nhiệm', 'Quyền hạn và trách nhiệm', 'Ký duyệt'],
    },
  ];
};

const getTemplateBuilders = () => ({
  labor_contract_basic: (vars) => [
    'HOP DONG LAO DONG',
    `Giua ${vars.company_name} va ${vars.employee_name}`,
    '',
    `1. Ben su dung lao dong: ${vars.company_name}`,
    `2. Nguoi lao dong: ${vars.employee_name}`,
    `3. Vi tri cong viec: ${vars.position}`,
    `4. Dia diem lam viec: ${vars.work_location}`,
    `5. Muc luong: ${vars.salary}`,
    `6. Ngay bat dau: ${vars.start_date}`,
    '7. Thoi gio lam viec va nghi ngoi: Theo noi quy lao dong va quy dinh phap luat hien hanh.',
    '8. Bao mat va xu ly vi pham: Cac ben cam ket bao mat thong tin va chiu trach nhiem theo hop dong.',
    '9. Cham dut hop dong: Theo cac truong hop quy dinh tai Bo luat Lao dong va thoa thuan cua cac ben.',
    '',
    'Dai dien ben su dung lao dong               Nguoi lao dong',
    '(Ky, ghi ro ho ten)                         (Ky, ghi ro ho ten)',
  ].join('\n'),
  service_contract_basic: (vars) => [
    'HOP DONG DICH VU',
    `Giua ${vars.client_name} va ${vars.vendor_name}`,
    '',
    `1. Ben su dung dich vu: ${vars.client_name}`,
    `2. Ben cung cap dich vu: ${vars.vendor_name}`,
    `3. Pham vi dich vu: ${vars.service_scope}`,
    `4. Phi dich vu: ${vars.fee}`,
    `5. Dieu kien thanh toan: ${vars.payment_terms}`,
    `6. Hieu luc tu ngay: ${vars.effective_date}`,
    '7. Nghiem thu va ban giao: Theo bien ban nghiem thu duoc hai ben xac nhan.',
    '8. Bao mat thong tin: Cac ben khong tiet lo thong tin kinh doanh cua nhau khi chua duoc dong y.',
    '9. Giai quyet tranh chap: Uu tien thuong luong, neu khong thanh thi khoi kien tai toa an co tham quyen.',
    '',
    'Dai dien ben A                              Dai dien ben B',
    '(Ky, ghi ro ho ten)                         (Ky, ghi ro ho ten)',
  ].join('\n'),
  official_notice: (vars) => [
    'THONG BAO',
    `Chu the ban hanh: ${vars.issuer_name}`,
    `Ngay ban hanh: ${vars.issue_date}`,
    `Chu de: ${vars.notice_subject}`,
    '',
    'Noi dung:',
    `${vars.notice_body}`,
    '',
    'Thong bao nay co hieu luc ke tu ngay ky.',
    '',
    'Dai dien don vi ban hanh',
    '(Ky, ghi ro ho ten)',
  ].join('\n'),
  official_letter: (vars) => [
    'CONG VAN',
    '',
    `Trang/Ky hieu:                          Ha Noi, ngay ${vars.issue_date}`,
    '',
    'VE: ' + vars.subject.toUpperCase(),
    '',
    `Kinh gui: ${vars.recipient_name}`,
    `Cua: ${vars.sender_department}`,
    '',
    'Noi dung:',
    `${vars.content}`,
    '',
    'Chinh thuc,',
    `${vars.sender_name}`,
    `${vars.sender_department}`,
  ].join('\n'),
  decision_document: (vars) => [
    'QUYET DINH',
    `So: ..... /QD-${vars.issuer_position.substring(0, 2).toUpperCase()}`,
    '',
    `NHAN: ${vars.decision_title.toUpperCase()}`,
    '',
    'CAN CU:',
    '- Luat doanh nghiep nam 2020',
    '- Quy dinh cua cong ty',
    '',
    'QUYET DINH:',
    `1. ${vars.decision_content}`,
    `2. Hieu luc tru ngay: ${vars.effective_date}`,
    `3. Ban hanh ngay: ${vars.announcement_date}`,
    '',
    'TRAC NHIEM THUC HIEN:',
    '- Cac phong ban lien quan thi hanh quyet dinh nay.',
    '- Ban chi dao tong hop va luu van ban cua cong ty.',
    '',
    'KY DUYET,',
    `${vars.issuer_name}`,
    `${vars.issuer_position}`,
  ].join('\n'),
  appointment_decision: (vars) => [
    'QUYET DINH BO NHIEM',
    `So: ..... /QD-HR`,
    '',
    `VE: BO NHIEM CHUC VU CHO ${vars.employee_name.toUpperCase()}`,
    '',
    'CAN CU:',
    '- Luat doanh nghiep nam 2020',
    '- Quy che to chuc va lam viec cua cong ty',
    '',
    'QUYET DINH:',
    `1. Bo nhiem ${vars.employee_name} tu Vi tri: ${vars.old_position}`,
    `   Len Vi tri: ${vars.new_position} effective ngay ${vars.appointment_date}`,
    '2. Huu luong va phu cap theo tieu chuan chuc vu moi.',
    '3. Muc do phuc tap cong viec tuong xung voi chuc vu moi.',
    '',
    'QUYEN HAN VA TRACH NHIEM:',
    '- Chiu trach nhiem theo quy dinh cong ty va phap luat.',
    '- Lap ke hoach va trien khai cong viec theo chi thi cua cap tren.',
    '',
    'KY DUYET,',
    `${vars.issuer_name}`,
    `${vars.company_name}`,
  ].join('\n'),
});

export const listTemplates = async () => {
  const templates = await getAllTemplates();
  console.log(`[TemplateServiceV2] Returning ${templates.length} templates`);
  return templates;
};

export const generateTemplateDraft = async ({  templateId, variables = {} }) => {
  const templates = await getAllTemplates();
  const template = templates.find((item) => item.id === templateId);

  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  const builders = getTemplateBuilders();
  const validateTemplateInput = (template, variables = {}) => {
    const errors = [];
    for (const field of template.required_fields || []) {
      const value = variables[field];
      if (!value || String(value).trim().length === 0) {
        errors.push(`Thiếu trường bắt buộc: ${field}`);
      }
    }
    return { valid: errors.length === 0, errors };
  };

  const validation = validateTemplateInput(template, variables);

  return {
    success: validation.valid,
    template,
    validation,
    text: validation.valid && builders[templateId] ? builders[templateId](variables) : '',
  };
};

export const exportDraftAsDocx = async ({ title = 'Document', text = '' }) => {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: title,
            formatting: {  bold: true, size: 28 },
          }),
          new Paragraph({
            text,
          }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
};

export const exportDraftAsPdf = async ({ title = 'Document', text = '' }) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      let buffer = Buffer.alloc(0);

      doc.on('data', (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
      });

      doc.on('end', () => {
        resolve(buffer);
      });

      doc.fontSize(16).text(title, { underline: true });
      doc.moveDown();
      doc.fontSize(11).text(text);
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};
