import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient = null;
let index = null;
let pineconeStatus = {
    configured: false,
    ready: false,
    indexName: null,
    lastError: null,
};

// Initialize Pinecone Connection
export const initPinecone = async () => {
    const indexName = process.env.PINECONE_INDEX || 'legal-ai';

    pineconeStatus = {
        configured: Boolean(process.env.PINECONE_API_KEY),
        ready: false,
        indexName,
        lastError: null,
    };

    if (!process.env.PINECONE_API_KEY) {
        console.warn('⚠️ PINECONE_API_KEY không tồn tại trong .env. Tính năng Search Vector tạm thời bị vô hiệu hoá.');
        return;
    }
    
    try {
        pineconeClient = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
        
        // Mặc định tên index là "legal-ai", thay đổi tuỳ ý
        index = pineconeClient.index(indexName);
        pineconeStatus.ready = true;
        console.log('✅ Đã kết nối Pinecone Vector Database thành công!');
    } catch (error) {
        pineconeStatus.lastError = error.message;
        console.error('❌ Lỗi khởi tạo Pinecone:', error);
    }
};

export const getPineconeStatus = () => pineconeStatus;

// Tìm kiếm điều luật (Similar Search)
export const searchLawsByVector = async (vectorCoordinates, topK = 5) => {
    if (!index) return [];
    
    try {
        const queryResponse = await index.query({
            vector: vectorCoordinates,
            topK,
            includeMetadata: true,
        });

        // Mapping dữ liệu trả về NodeJS định dạng chuẩn
        return queryResponse.matches.map(item => ({
            score: item.score,
            lawId: item.id,
            content: item.metadata.content || '',
            article: item.metadata.article || '',
            title: item.metadata.title || ''
        }));
    } catch (error) {
        console.error('❌ Lỗi truy vấn Vector:', error);
        return [];
    }
};
