// functions/api/stats.js
export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    // 這裡需要連接到您的資料庫來獲取真實統計數據
    // 以下是示例代碼，需要根據您的資料庫配置進行調整
    
    // 優先使用 SheetDB，如果沒有則使用 D1 資料庫
    if (env.SHEETDB_URL) {
      try {
        const response = await fetch(env.SHEETDB_URL);
        if (!response.ok) {
          throw new Error(`SheetDB API error: ${response.status}`);
        }
        const data = await response.json();
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 計算今日訪客數
        const todayCount = data.filter(visitor => {
          if (!visitor.created_at) return false;
          const visitorDate = new Date(visitor.created_at).toISOString().split('T')[0];
          return visitorDate === today;
        }).length;
        
        // 計算本週訪客數
        const weekCount = data.filter(visitor => {
          if (!visitor.created_at) return false;
          const visitorDate = new Date(visitor.created_at).toISOString().split('T')[0];
          return visitorDate >= weekAgo;
        }).length;
        
        // 總訪客數
        const totalCount = data.length;
        
        return new Response(JSON.stringify({
          today: todayCount,
          week: weekCount,
          total: totalCount,
          lastUpdated: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=60'
          }
        });
        
      } catch (sheetError) {
        console.error('SheetDB error:', sheetError);
        return new Response(JSON.stringify({
          error: 'SheetDB connection failed',
          today: 0,
          week: 0,
          total: 0
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB) {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        // 今日訪客數
        const todayResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM visitors WHERE DATE(created_at) = ?"
        ).bind(today).first();
        
        // 本週訪客數
        const weekResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM visitors WHERE DATE(created_at) >= ?"
        ).bind(weekAgo).first();
        
        // 總訪客數
        const totalResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM visitors"
        ).first();
        
        return new Response(JSON.stringify({
          today: todayResult?.count || 0,
          week: weekResult?.count || 0,
          total: totalResult?.count || 0,
          lastUpdated: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=60' // 快取1分鐘
          }
        });
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify({
          error: 'Database connection failed',
          today: 0,
          week: 0,
          total: 0
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 如果沒有配置資料庫，返回預設值
    return new Response(JSON.stringify({
      today: 0,
      week: 0,
      total: 0,
      message: 'Database not configured. Please set up Cloudflare D1 or other database.',
      lastUpdated: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Stats API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      today: 0,
      week: 0,
      total: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}