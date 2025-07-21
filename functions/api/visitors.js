// functions/api/visitors.js
const cookie = require('cookie');

export async function onRequestGet(context) {
  try {
    const { env, request } = context;
    
    // 檢查管理員身份驗證
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const cookies = cookie.parse(cookieHeader);
    if (!cookies.auth_session || cookies.auth_session !== 'user-is-logged-in') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // 優先使用 SheetDB，如果沒有則使用 D1 資料庫
    if (env.SHEETDB_URL) {
      try {
        const response = await fetch(env.SHEETDB_URL);
        if (!response.ok) {
          throw new Error(`SheetDB API error: ${response.status}`);
        }
        const data = await response.json();
        
        // 如果有搜尋參數，進行過濾
        const search = searchParams.get('search');
        let filteredData = data;
        if (search) {
          filteredData = data.filter(visitor => 
            (visitor.name && visitor.name.toLowerCase().includes(search.toLowerCase())) ||
            (visitor.email && visitor.email.toLowerCase().includes(search.toLowerCase()))
          );
        }
        
        return new Response(JSON.stringify(filteredData), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30'
          }
        });
        
      } catch (sheetError) {
        console.error('SheetDB error:', sheetError);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB) {
      try {
        let query = "SELECT * FROM visitors ORDER BY created_at DESC";
        let params = [];
        
        // 支援搜尋功能
        const search = searchParams.get('search');
        if (search) {
          query = "SELECT * FROM visitors WHERE name LIKE ? OR email LIKE ? ORDER BY created_at DESC";
          params = [`%${search}%`, `%${search}%`];
        }
        
        const stmt = params.length > 0 
          ? env.DB.prepare(query).bind(...params)
          : env.DB.prepare(query);
          
        const result = await stmt.all();
        
        // 返回與前端期望格式一致的數據
        return new Response(JSON.stringify(result.results || []), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'max-age=30'
          }
        });
        
      } catch (dbError) {
        console.error('Database error:', dbError);
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 如果沒有資料庫，返回空陣列（模擬無數據狀態）
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
  } catch (error) {
    console.error('Visitors API error:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    
    // 詳細的錯誤日誌
    console.log('POST request received');
    console.log('Environment variables:', {
      hasSheetDB: !!env.SHEETDB_URL,
      hasDB: !!env.DB,
      sheetDBUrl: env.SHEETDB_URL ? 'SET' : 'NOT_SET'
    });
    
    const visitorData = await request.json();
    console.log('Visitor data:', visitorData);
    
    // 驗證必要欄位
    if (!visitorData.name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Name is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 優先使用 SheetDB，如果沒有則使用 D1 資料庫
    if (env.SHEETDB_URL) {
      try {
        const response = await fetch(env.SHEETDB_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: visitorData.id || new Date().toISOString(),
            name: visitorData.name,
            email: visitorData.email || '',
            phone: visitorData.phone || '',
            address: visitorData.address || '',
            howDidYouHear: visitorData.howDidYouHear || '',
            howDidYouHearOther: visitorData.howDidYouHearOther || '',
            isFirstVisit: visitorData.isFirstVisit || 'no',
            wantsContact: visitorData.wantsContact || 'no',
            prayerRequest: visitorData.prayerRequest || '',
            created_at: new Date().toISOString()
          })
        });
        
        if (!response.ok) {
          throw new Error(`SheetDB API error: ${response.status}`);
        }
        
        const result = await response.json();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data saved successfully to SheetDB',
          data: result
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (sheetError) {
        console.error('SheetDB insert error:', sheetError);
        console.error('SheetDB URL:', env.SHEETDB_URL);
        console.error('Full SheetDB response status:', response.status);
        console.error('Full SheetDB response headers:', [...response.headers.entries()]);
        console.error('Request body:', JSON.stringify({
          name: visitorData.name,
          email: visitorData.email || '',
          phone: visitorData.phone || '',
          address: visitorData.address || '',
          howDidYouHear: visitorData.howDidYouHear || '',
          isFirstVisit: visitorData.isFirstVisit || 'no',
          wantsContact: visitorData.wantsContact || 'no',
          prayerRequest: visitorData.prayerRequest || '',
          created_at: new Date().toISOString()
        }));
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to save visitor data to SheetDB: ${sheetError.message}`,
          details: sheetError.toString()
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB) {
      try {
        const stmt = env.DB.prepare(`
          INSERT INTO visitors (
            name, email, phone, address, how_did_you_hear, 
            is_first_visit, wants_contact, prayer_request, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `);
        
        const result = await stmt.bind(
          visitorData.name,
          visitorData.email || null,
          visitorData.phone || null,
          visitorData.address || null,
          visitorData.howDidYouHear || null,
          visitorData.isFirstVisit === 'yes' ? 1 : 0,
          visitorData.wantsContact === 'yes' ? 1 : 0,
          visitorData.prayerRequest || null
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data saved successfully',
          id: result.meta.last_row_id
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (dbError) {
        console.error('Database insert error:', dbError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to save visitor data'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    // 如果沒有資料庫，模擬成功
    return new Response(JSON.stringify({
      success: true,
      message: 'Form submitted successfully (Database not configured)',
      note: 'To persist data, please set up D1 database'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Visitor POST error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request data'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestPut(context) {
  try {
    const { env, request } = context;
    
    // 檢查管理員身份驗證
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const cookies = cookie.parse(cookieHeader);
    if (!cookies.auth_session || cookies.auth_session !== 'user-is-logged-in') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const visitorData = await request.json();
    
    // 優先使用 SheetDB 更新
    if (env.SHEETDB_URL && visitorData.id) {
      try {
        console.log('Attempting to update visitor:', visitorData.id);
        
        // 方法 1: 使用 PATCH 方法更新特定記錄
        const updateData = {
          name: visitorData.name,
          email: visitorData.email || '',
          phone: visitorData.phone || '',
          howDidYouHear: visitorData.howDidYouHear || '',
          howDidYouHearOther: visitorData.howDidYouHearOther || '',
          isFirstVisit: visitorData.isFirstVisit || 'no',
          wantsContact: visitorData.wantsContact || 'no',
          prayerRequest: visitorData.prayerRequest || '',
          updated_at: new Date().toISOString()
        };
        
        // 嘗試多種更新方法
        let response;
        let updateMethod = 'unknown';
        
        // 方法 1: PATCH with JSON body containing id
        try {
          response = await fetch(env.SHEETDB_URL, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: visitorData.id,
              ...updateData
            })
          });
          updateMethod = 'patch_with_id';
        } catch (e) {
          console.log('PATCH method 1 failed:', e.message);
        }
        
        // 方法 2: 如果第一種方法失敗，嘗試路徑參數方式
        if (!response || !response.ok) {
          try {
            const updateUrl = `${env.SHEETDB_URL}/id/${encodeURIComponent(visitorData.id)}`;
            response = await fetch(updateUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updateData)
            });
            updateMethod = 'patch_with_path';
          } catch (e) {
            console.log('PATCH method 2 failed:', e.message);
          }
        }
        
        // 方法 3: 如果 PATCH 失敗，嘗試 PUT
        if (!response || !response.ok) {
          try {
            response = await fetch(env.SHEETDB_URL, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                id: visitorData.id,
                ...updateData
              })
            });
            updateMethod = 'put_method';
          } catch (e) {
            console.log('PUT method failed:', e.message);
          }
        }
        
        if (!response || !response.ok) {
          const errorMsg = response ? `HTTP ${response.status}` : 'Network error';
          throw new Error(`SheetDB update error: ${errorMsg}`);
        }
        
        console.log(`Update successful using method: ${updateMethod}`);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data updated successfully in SheetDB'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (sheetError) {
        console.error('SheetDB update error:', sheetError);
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to update visitor data in SheetDB: ${sheetError.message}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB && visitorData.id) {
      try {
        const stmt = env.DB.prepare(`
          UPDATE visitors SET 
            name = ?, email = ?, phone = ?, address = ?, 
            how_did_you_hear = ?, is_first_visit = ?, 
            wants_contact = ?, prayer_request = ?, updated_at = datetime('now')
          WHERE id = ?
        `);
        
        await stmt.bind(
          visitorData.name,
          visitorData.email || null,
          visitorData.phone || null,
          visitorData.address || null,
          visitorData.howDidYouHear || null,
          visitorData.isFirstVisit === 'yes' ? 1 : 0,
          visitorData.wantsContact === 'yes' ? 1 : 0,
          visitorData.prayerRequest || null,
          visitorData.id
        ).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data updated successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (dbError) {
        console.error('Database update error:', dbError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to update visitor data'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Update simulated (Database not configured)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Visitor PUT error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request data'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const { env, request } = context;
    
    // 檢查管理員身份驗證
    const cookieHeader = request.headers.get('Cookie');
    if (!cookieHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized - No session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const cookies = cookie.parse(cookieHeader);
    if (!cookies.auth_session || cookies.auth_session !== 'user-is-logged-in') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid session' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    // 優先使用 SheetDB 刪除
    if (env.SHEETDB_URL && id) {
      try {
        // SheetDB 刪除方法：使用 POST 方法搭配 _method=DELETE
        const response = await fetch(env.SHEETDB_URL, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: id
          })
        });
        
        // 如果第一種方法失敗，嘗試其他方法
        if (!response.ok) {
          console.log('First delete method failed, trying alternative methods...');
          
          // 方法 2: 使用查詢參數
          try {
            const deleteUrl2 = `${env.SHEETDB_URL}?id=${encodeURIComponent(id)}`;
            const response2 = await fetch(deleteUrl2, {
              method: 'DELETE'
            });
            
            if (response2.ok) {
              console.log('Delete method 2 succeeded');
            } else {
              // 方法 3: 使用路徑參數
              const deleteUrl3 = `${env.SHEETDB_URL}/id/${encodeURIComponent(id)}`;
              const response3 = await fetch(deleteUrl3, {
                method: 'DELETE'
              });
              
              if (response3.ok) {
                console.log('Delete method 3 succeeded');
              } else {
                // 方法 4: 軟刪除 - 標記為已刪除而不是真正刪除
                console.log('All delete methods failed, using soft delete...');
                
                // 嘗試多種軟刪除方法
                let softDeleteSuccess = false;
                
                // 軟刪除方法 1: PATCH with id in body
                try {
                  const softDeleteResponse1 = await fetch(env.SHEETDB_URL, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      id: id,
                      deleted: true,
                      deleted_at: new Date().toISOString(),
                      name: '[已刪除]'
                    })
                  });
                  
                  if (softDeleteResponse1.ok) {
                    softDeleteSuccess = true;
                    console.log('Soft delete method 1 succeeded');
                  }
                } catch (e) {
                  console.log('Soft delete method 1 failed:', e.message);
                }
                
                // 軟刪除方法 2: PUT with id in body
                if (!softDeleteSuccess) {
                  try {
                    const softDeleteResponse2 = await fetch(env.SHEETDB_URL, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        id: id,
                        deleted: true,
                        deleted_at: new Date().toISOString(),
                        name: '[已刪除]'
                      })
                    });
                    
                    if (softDeleteResponse2.ok) {
                      softDeleteSuccess = true;
                      console.log('Soft delete method 2 succeeded');
                    }
                  } catch (e) {
                    console.log('Soft delete method 2 failed:', e.message);
                  }
                }
                
                if (!softDeleteSuccess) {
                  // 最後的備援方案：返回成功但說明限制
                  console.log('All delete and soft delete methods failed, returning simulated success');
                  return new Response(JSON.stringify({
                    success: true,
                    message: 'Delete operation simulated (SheetDB limitations)',
                    note: 'Record marked for manual deletion. Please remove from Google Sheets manually.',
                    record_id: id,
                    method: 'simulated_delete'
                  }), {
                    headers: { 'Content-Type': 'application/json' }
                  });
                }
                
                return new Response(JSON.stringify({
                  success: true,
                  message: 'Visitor data marked as deleted (soft delete)',
                  method: 'soft_delete'
                }), {
                  headers: { 'Content-Type': 'application/json' }
                });
              }
            }
          } catch (deleteError) {
            throw new Error(`SheetDB delete error: ${deleteError.message}`);
          }
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data deleted successfully from SheetDB',
          method: 'hard_delete'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (sheetError) {
        console.error('SheetDB delete error:', sheetError);
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to delete visitor data from SheetDB: ${sheetError.message}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (env.DB && id) {
      try {
        const stmt = env.DB.prepare('DELETE FROM visitors WHERE id = ?');
        await stmt.bind(id).run();
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Visitor data deleted successfully'
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (dbError) {
        console.error('Database delete error:', dbError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Failed to delete visitor data'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      message: 'Delete simulated (Database not configured)'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Visitor DELETE error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}