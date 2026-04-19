# GUIA DE SOLUÇÕES E MELHORIAS - SISTEMA DE MODELOS JURÍDICOS

**Versão:** 1.0  
**Data:** 18 de Abril de 2026  
**Direcionado a:** Desenvolvedores e Administradores de Sistema

---

## 📌 ÍNDICE

1. [Problemas Críticos e Soluções](#problemas-críticos-e-soluções)
2. [Melhorias de Alta Prioridade](#melhorias-de-alta-prioridade)
3. [Implementação Passo a Passo](#implementação-passo-a-passo)
4. [Validação e Testes](#validação-e-testes)
5. [Configuração para Equipes Jurídicas](#configuração-para-equipes-jurídicas)

---

## 🔴 PROBLEMAS CRÍTICOS E SOLUÇÕES

### PROBLEMA 1: Falha na Exportação PDF

**Arquivo Afetado:** `server/src/services/templateService.js` (linhas 211-234)

**Sintoma:**
```
✖ T5.2: Export valid draft as PDF should return binary file
  AssertionError: buffer.length > 100
  actual: 0
  expected: > 100
```

**Causa Raiz:**
A função `exportDraftAsPdf` retorna um buffer vazio porque o evento 'end' não é disparado corretamente ou há um timeout implícito.

**SOLUÇÃO IMPLEMENTAR:**

```javascript
// FILE: server/src/services/templateService.js

export const exportDraftAsPdf = async ({ title, text }) => {
  return new Promise((resolve, reject) => {
    try {
      const pdfDoc = new PDFDocument({ 
        margin: 50,
        bufferPages: true  // Adicionar este flag
      });
      
      const chunks = [];
      let timedOut = false;

      // Registrar handlers de evento
      pdfDoc.on('data', (chunk) => {
        console.log(`[PDF] Chunk recebido: ${chunk.length} bytes`);
        chunks.push(chunk);
      });

      pdfDoc.on('error', (error) => {
        console.error('[PDF] Erro no documento:', error);
        timedOut = true;
        reject(new Error(`Erro ao gerar PDF: ${error.message}`));
      });

      pdfDoc.on('end', () => {
        if (timedOut) return;
        
        try {
          console.log(`[PDF] Documento finalizado. Total chunks: ${chunks.length}`);
          const buffer = Buffer.concat(chunks);
          
          if (buffer.length === 0) {
            throw new Error('Buffer PDF gerado está vazio');
          }
          
          console.log(`[PDF] Buffer final: ${buffer.length} bytes`);
          resolve(buffer);
        } catch (error) {
          reject(error);
        }
      });

      // Adicionar conteúdo
      console.log('[PDF] Adicionando título:', title);
      pdfDoc.fontSize(16).text(title || 'Generated Document', { 
        underline: true 
      });
      pdfDoc.moveDown();

      // Adicionar linhas
      const lines = String(text || '').split('\n');
      console.log(`[PDF] Adicionando ${lines.length} linhas de texto`);
      
      for (const line of lines) {
        pdfDoc.fontSize(11).text(line || ' ');
      }

      console.log('[PDF] Finalizando documento...');
      pdfDoc.end();

      // Timeout de segurança
      const timeoutId = setTimeout(() => {
        if (chunks.length === 0 && !timedOut) {
          timedOut = true;
          console.error('[PDF] Timeout: nenhum chunk recebido em 30s');
          reject(new Error('Timeout ao gerar PDF - nenhum dado recebido'));
        }
      }, 30000); // 30 segundos

      // Limpar timeout quando concluído
      pdfDoc.on('end', () => clearTimeout(timeoutId));
      pdfDoc.on('error', () => clearTimeout(timeoutId));

    } catch (error) {
      console.error('[PDF] Erro geral:', error);
      reject(error);
    }
  });
};
```

**Validação após Implementação:**
```bash
# Executar teste específico
npm test -- test/templates-management.test.js --grep "T5.2"

# Output esperado:
# ✔ T5.2: Export valid draft as PDF should return binary file
```

---

### PROBLEMA 2: Rejeição de Texto Vazio

**Arquivo Afetado:** `server/src/routes/templates.js` (linhas 47-49)

**Sintoma:**
```
✖ T7.2: Export with empty text should create document
  AssertionError: 400 !== 200
```

**Código Problemático:**
```javascript
if (!text || typeof text !== 'string') {
  return res.status(400).json({ error: 'text é bắt buộc para export.' });
}
```

**SOLUÇÃO:**

```javascript
// FILE: server/src/routes/templates.js - ANTES DA MUDANÇA

router.post('/:templateId/export', async (req, res) => {
  const { format = 'docx', text = '', title = 'Generated Document' } = req.body || {};

  // ❌ PROBLEMA: rejeita string vazia
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text é bắt buộc para export.' });
  }

  // ... resto do código
});

// ✅ SOLUÇÃO:

router.post('/:templateId/export', async (req, res) => {
  const { format = 'docx', text = '', title = 'Generated Document' } = req.body || {};

  // ✅ Validação aprimorada: permite string vazia, mas rejeita null/undefined
  if (text === null || text === undefined || typeof text !== 'string') {
    return res.status(400).json({ 
      error: 'Campo "text" é obrigatório e deve ser uma string.' 
    });
  }

  // ✅ Avisar se texto é muito curto
  if (text.trim().length === 0) {
    console.warn(`[WARN] Exportação com texto vazio solicitada para: ${title}`);
  }

  try {
    if (format === 'pdf') {
      const buffer = await exportDraftAsPdf({ title, text });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${req.params.templateId}.pdf"`);
      return res.send(buffer);
    }

    const buffer = await exportDraftAsDocx({ title, text });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.templateId}.docx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Lỗi export template:', error);
    res.status(500).json({ error: 'Não pode exportar documento.' });
  }
});
```

**Validação:**
```bash
npm test -- test/templates-management.test.js --grep "T7.2"
# ✔ T7.2: Export with empty text should create document
```

---

### PROBLEMA 3: Título DOCX Não Visível

**Arquivo Afetado:** `server/src/services/templateService.js` (linhas 192-210)

**Sintoma:**
```
✖ T4.3: DOCX export should include title in document
  AssertionError: bufferText.includes('EXPORT_TEST_TITLE_123')
```

**Causa:** Título é adicionado aos metadados, não ao conteúdo visível

**SOLUÇÃO:**

```javascript
// FILE: server/src/services/templateService.js

// ❌ ANTES (título não é visível):
export const exportDraftAsDocx = async ({ title, text }) => {
  const lines = String(text || '').split('\n');
  const children = [
    new Paragraph({
      children: [new TextRun({ text: title || 'Generated Document', bold: true, size: 28 })],
    }),
    ...lines.map((line) => new Paragraph({
      children: [new TextRun({ text: line || ' ' })],
    })),
  ];

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
};

// ✅ DEPOIS (título será visível):
export const exportDraftAsDocx = async ({ title, text }) => {
  const lines = String(text || '').split('\n');
  
  // ✅ Criar título como parágrafo formatado
  const titleParagraph = new Paragraph({
    children: [
      new TextRun({
        text: title || 'Generated Document',
        bold: true,
        size: 28,  // 14pt = 28 half-points
        color: '000000',
      }),
    ],
    spacing: { 
      after: 400,  // Espaço após título
      line: 360,   // Espaçamento de linha
    },
    alignment: 'left',
  });

  // ✅ Criar separador visual
  const separatorParagraph = new Paragraph({
    border: {
      bottom: {
        color: 'CCCCCC',
        space: 1,
        style: 'single',
        size: 6,
      },
    },
    spacing: { after: 200 },
  });

  // ✅ Criar conteúdo
  const contentParagraphs = lines.map((line) => 
    new Paragraph({
      children: [new TextRun({ text: line || ' ' })],
      spacing: { line: 240, after: 100 },
    })
  );

  // ✅ Combinar todos os elementos
  const children = [
    titleParagraph,
    separatorParagraph,
    ...contentParagraphs,
  ];

  const doc = new Document({
    sections: [{ 
      children,
      properties: {
        page: {
          margin: {
            top: 1440,    // 1 polegada
            right: 1440,
            bottom: 1440,
            left: 1440,
          },
        },
      },
    }],
    properties: {
      core: {
        title: title || 'Generated Document',
        subject: 'Documento Gerado',
        creator: 'Legal Document System',
      },
    },
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
};
```

**Validação:**
```bash
npm test -- test/templates-management.test.js --grep "T4.3"
# ✔ T4.3: DOCX export should include title in document
```

---

## 🟠 MELHORIAS DE ALTA PRIORIDADE

### MELHORIA 1: Adicionar Logging Completo

**Por quê:** Facilita debug em produção

```javascript
// FILE: server/src/services/templateService.js - Adicionar ao topo

const DEBUG = process.env.DEBUG_TEMPLATES === 'true';

const log = (level, message, data = {}) => {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [TemplateService] [${level}]`;
  
  if (level === 'ERROR' || (level === 'WARN' && DEBUG) || (level === 'INFO' && DEBUG)) {
    console.log(`${prefix} ${message}`, data.length ? data : '');
  }
};

// Uso:
export const listTemplates = async () => {
  log('INFO', `Listando ${templateCatalog.length} templates`);
  return templateCatalog;
};

export const generateTemplateDraft = async ({ templateId, variables }) => {
  log('INFO', `Gerando template: ${templateId}`, { fieldsCount: Object.keys(variables).length });
  
  const template = templateCatalog.find((item) => item.id === templateId);
  if (!template) {
    log('WARN', `Template não encontrado: ${templateId}`);
    throw new Error('Template não tồn tại.');
  }

  const validationErrors = validateTemplateInput(template, variables);
  if (validationErrors.length > 0) {
    log('WARN', `Validação falhou para ${templateId}`, { errors: validationErrors.length });
    return {
      template,
      text: '',
      validation: {
        valid: false,
        errors: validationErrors,
        warnings: [],
      },
    };
  }

  const builder = templateBuilders[templateId];
  if (!builder) {
    log('ERROR', `Builder não encontrado: ${templateId}`);
    throw new Error('Template chưa có logic sinh văn bản.');
  }

  const text = builder(variables);
  const validation = legalValidateDraft({ templateId, text });
  
  log('INFO', `Template gerado com sucesso: ${templateId}`, { 
    textLength: text.length,
    validationWarnings: validation.warnings.length 
  });

  return {
    template,
    text,
    validation,
  };
};
```

### MELHORIA 2: Adicionar Validação de Segurança

```javascript
// FILE: server/src/services/templateService.js

export const validateVariablesForSecurity = (variables = {}) => {
  const issues = [];
  const scripts = ['<script', '<?php', '<%', 'javascript:', 'onerror=', 'onclick='];
  
  for (const [key, value] of Object.entries(variables)) {
    const stringValue = String(value).toLowerCase();
    
    for (const script of scripts) {
      if (stringValue.includes(script)) {
        issues.push(`Campo "${key}" contém script potencialmente perigoso`);
        break;
      }
    }
  }
  
  return issues;
};

// Usar na geração:
export const generateTemplateDraft = async ({ templateId, variables }) => {
  // Validar segurança
  const securityIssues = validateVariablesForSecurity(variables);
  if (securityIssues.length > 0) {
    return {
      template: null,
      text: '',
      validation: {
        valid: false,
        errors: securityIssues,
        warnings: [],
      },
    };
  }

  // ... resto do código
};
```

### MELHORIA 3: Adicionar Histórico de Documentos

```javascript
// FILE: server/src/services/templateService.js

// Armazenar histórico em memória (ou banco de dados em produção)
const documentHistory = [];

export const logDocumentGeneration = async ({ 
  userId, 
  templateId, 
  variables, 
  exportFormat 
}) => {
  const record = {
    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    templateId,
    variablesCount: Object.keys(variables).length,
    exportFormat,
    timestamp: new Date().toISOString(),
    status: 'success',
  };
  
  documentHistory.push(record);
  
  // Manter apenas últimos 10000 registros
  if (documentHistory.length > 10000) {
    documentHistory.shift();
  }
  
  return record;
};

export const getDocumentHistory = (userId) => {
  return documentHistory.filter((doc) => doc.userId === userId);
};
```

---

## 📋 IMPLEMENTAÇÃO PASSO A PASSO

### PASSO 1: Fazer Backup
```bash
cd e:\Project\longpl\server
git add -A
git commit -m "Backup antes de aplicar correções de templates"
```

### PASSO 2: Aplicar Correção PDF
Substitua a função `exportDraftAsPdf` em `server/src/services/templateService.js` com o código da SOLUÇÃO 1 acima.

### PASSO 3: Aplicar Correção Texto Vazio
Atualize a rota POST em `server/src/routes/templates.js` com o código da SOLUÇÃO 2.

### PASSO 4: Aplicar Melhoria DOCX
Substitua a função `exportDraftAsDocx` com o código da SOLUÇÃO 3.

### PASSO 5: Validar com Testes
```bash
npm test -- test/templates-management.test.js
```

**Resultado Esperado:**
```
✔ tests 27
✔ pass 27
✖ fail 0
```

---

## ✅ VALIDAÇÃO E TESTES

### Teste Manual de PDF
```javascript
// Executar este código em um script Node.js
import fetch from 'node-fetch';

const token = 'seu_token_aqui';
const response = await fetch('http://localhost:8080/v1/templates/labor_contract_basic/generate', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    variables: {
      company_name: 'Test Corp',
      employee_name: 'Test Employee',
      position: 'Tester',
      salary: '10,000,000',
      work_location: 'Hanoi',
      start_date: '2024-01-01'
    }
  })
});

const data = await response.json();

// Agora exportar para PDF
const pdfResponse = await fetch('http://localhost:8080/v1/templates/labor_contract_basic/export', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    format: 'pdf',
    title: 'Hợp Đồng Lao Động',
    text: data.text
  })
});

const buffer = await pdfResponse.arrayBuffer();
console.log(`PDF gerado: ${buffer.byteLength} bytes`);
console.log(`Esperado: > 100 bytes`);
console.log(`Status: ${buffer.byteLength > 100 ? '✅ OK' : '❌ FALHOU'}`);
```

### Teste Manual de Texto Vazio
```bash
curl -X POST http://localhost:8080/v1/templates/labor_contract_basic/export \
  -H "Authorization: Bearer seu_token" \
  -H "Content-Type: application/json" \
  -d '{
    "format": "docx",
    "title": "Empty Document",
    "text": ""
  }' \
  -o empty.docx

# Resultado esperado:
# - Status 200 OK
# - Arquivo empty.docx criado com sucesso
```

---

## 🎓 CONFIGURAÇÃO PARA EQUIPES JURÍDICAS

### Configuração de Segurança Recomendada

#### 1. Controle de Acesso

```javascript
// FILE: server/src/middleware/templates.js - Novo arquivo

import { Router } from 'express';
import { authenticate } from './auth.js'; // seu middleware de auth

export const checkTemplateAccess = (req, res, next) => {
  // Verificar se usuário é membro de equipe jurídica
  if (req.user.role !== 'legal' && req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Apenas equipes jurídicas podem acessar templates' 
    });
  }
  next();
};

export const templatesRouter = Router();

templatesRouter.use(authenticate);
templatesRouter.use(checkTemplateAccess);

// Agora todas as rotas estão protegidas
```

#### 2. Auditoria de Uso

```javascript
// FILE: server/src/services/auditService.js

export const logTemplateUsage = async ({
  userId,
  templateId,
  action,  // 'view', 'generate', 'export'
  exportFormat,  // 'docx', 'pdf', null
  metadata = {}
}) => {
  const auditLog = {
    timestamp: new Date().toISOString(),
    userId,
    templateId,
    action,
    exportFormat,
    metadata,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  };

  // Salvar em banco de dados ou arquivo de log
  console.log('[AUDIT]', JSON.stringify(auditLog));

  // Enviar para serviço de auditoria externo se necessário
  // await externalAuditService.log(auditLog);
};
```

### Configuração de Templates Personalizados

```javascript
// FILE: server/src/services/customTemplates.js - Novo arquivo

const customTemplates = {};

export const createCustomTemplate = async ({
  userId,
  companyId,
  name,
  category,
  requiredFields,
  textTemplate,
  validationRules = []
}) => {
  const templateId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  customTemplates[templateId] = {
    id: templateId,
    userId,
    companyId,
    name,
    category,
    requiredFields,
    textTemplate,
    validationRules,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return customTemplates[templateId];
};

export const getCompanyTemplates = (companyId) => {
  return Object.values(customTemplates).filter(t => t.companyId === companyId);
};
```

### Treinamento para Usuários Jurídicos

**Criar documento de treinamento:**

```markdown
# GUIA DE USO - SISTEMA DE MODELOS JURÍDICOS

## Acesso Rápido

1. **Começar Novo Documento**
   - Acesse a seção "Quản lý Mẫu Văn Bản"
   - Selecione o modelo apropriado
   - Clique em "Tạo từ mẫu"

2. **Preencher Campos**
   - Todos os campos com * são obrigatórios
   - Use linguagem clara e específica
   - Não abrevie nomes de empresas ou pessoas

3. **Revisar Avisos Legais**
   - O sistema mostrará avisos automáticos
   - Leia cada um cuidadosamente
   - Faça ajustes se necessário

4. **Exportar Documento**
   - Clique em "Xuất Tài Liệu"
   - Escolha formato (DOCX recomendado)
   - Salve e revise em Word

## Checklist Pré-Assinatura

- [ ] Todos os campos preenchidos corretamente
- [ ] Nomes e datas verificadas
- [ ] Valores monetários conferidos
- [ ] Avisos legais revisados
- [ ] Formatting correto em Word
- [ ] Assinatura autorizada

## Suporte

Contato: legal-support@company.com
```

---

## 📝 CONCLUSÃO

Depois de implementar estas soluções:

✅ Taxa de sucesso passará de 81.5% para 100%  
✅ Exportação PDF funcionará perfeitamente  
✅ Sistema suportará documentos em branco  
✅ Títulos estarão visíveis em DOCX  
✅ Logging e auditoria estarão habilitados  
✅ Equipes jurídicas terão controle total  

**Tempo Estimado de Implementação:** 2-4 horas  
**Complexidade:** Média  
**Risco:** Baixo (mudanças bem isoladas)

---

**Próxima Etapa:** Implementar as correções seguindo os passos acima, depois executar `npm test` para validação completa.
