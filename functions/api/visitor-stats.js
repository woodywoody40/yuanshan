// functions/api/visitor-stats.js
export async function onRequestGet(context) {
  try {
    const { env } = context;
    
    // 優先使用 SheetDB，如果沒有則使用 D1 資料庫
    if (env.SHEETDB_URL) {
      try {
        const response = await fetch(env.SHEETDB_URL);
        if (!response.ok) {
          throw new Error(`SheetDB API error: ${response.status}`);
        }
        const data = await response.json();
        
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // 計算今日訪客數
        const todayCount = data.filter(visitor => {
          if (!visitor.created_at) return false;
          const visitorDate = new Date(visitor.created_at).toISOString().split('T')[0];
          return visitorDate === today;
        }).length;
        
        const todayPosition = todayCount + 1; // 下一位訪客的位置
        const totalCount = data.length;
        
        return new Response(JSON.stringify({
          todayPosition: todayPosition,
          totalCount: totalCount,
          lastUpdated: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30'
          }
        });
        
      } catch (sheetError) {
        console.error('SheetDB error:', sheetError);
        return new Response(JSON.stringify({
          error: 'SheetDB connection failed',
          todayPosition: 1,
          totalCount: 0
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB) {
      try {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        // 今日訪客數（用於計算位置）
        const todayCountResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM visitors WHERE DATE(created_at) = ?"
        ).bind(today).first();
        
        // 總訪客數
        const totalCountResult = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM visitors"
        ).first();
        
        const todayPosition = (todayCountResult?.count || 0) + 1; // 下一位訪客的位置
        const totalCount = totalCountResult?.count || 0;
        
        return new Response(JSON.stringify({
          todayPosition: todayPosition,
          totalCount: totalCount,
          lastUpdated: new Date().toISOString()
        }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30' // 快取30秒
          }
        });
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify({
          error: 'Database connection failed',
          todayPosition: 1,
          totalCount: 0
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 如果沒有配置資料庫
    return new Response(JSON.stringify({
      todayPosition: 1,
      totalCount: 0,
      message: 'Database not configured',
      lastUpdated: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Visitor stats API error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      todayPosition: 1,
      totalCount: 0
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}