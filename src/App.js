import React, { useState, useEffect } from 'react';
import { Calendar, Droplet, Flame, Plus, Trash2, BarChart3, Clock } from 'lucide-react';

const FastingApp = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState({});
  const [foodInput, setFoodInput] = useState('');
  const [quantity, setQuantity] = useState('');
  const [fastingWindow, setFastingWindow] = useState({ start: '20:00', end: '12:00' });
  const [calculating, setCalculating] = useState(false);
  const [stats, setStats] = useState(null);

  // 初始化日期數據
  useEffect(() => {
    const stored = localStorage.getItem('fastingData');
    if (stored) {
      setMeals(JSON.parse(stored));
    }
  }, []);

  // 保存數據到localStorage
  useEffect(() => {
    localStorage.setItem('fastingData', JSON.stringify(meals));
  }, [meals]);

  // 計算今日統計
  useEffect(() => {
    const todayMeals = meals[date] || [];
    const totalCals = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
    const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein || 0), 0);
    const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs || 0), 0);
    const totalFat = todayMeals.reduce((sum, m) => sum + (m.fat || 0), 0);

    setStats({
      calories: totalCals,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
      mealCount: todayMeals.length
    });
  }, [meals, date]);

  // 使用Claude API計算熱量和營養
  const calculateNutrition = async () => {
    if (!foodInput.trim() || !quantity.trim()) return;

    setCalculating(true);
    try {
      const prompt = `計算以下食物的營養信息。請以JSON格式回應，包含：calories(熱量, 單位kcal), protein(蛋白質, 單位g), carbs(碳水化合物, 單位g), fat(脂肪, 單位g)。

食物: ${foodInput}
份量: ${quantity}

只回應JSON格式，例如: {"calories": 300, "protein": 25, "carbs": 30, "fat": 10}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();
      const responseText = data.content[0].text;
      
      // 提取JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const nutrition = JSON.parse(jsonMatch[0]);
        addMeal({
          food: foodInput,
          quantity: quantity,
          ...nutrition,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        });
        setFoodInput('');
        setQuantity('');
      }
    } catch (error) {
      console.error('計算營養失敗:', error);
      alert('無法計算營養。請確保API金鑰已設置');
    }
    setCalculating(false);
  };

  const addMeal = (meal) => {
    const todayMeals = meals[date] || [];
    setMeals({
      ...meals,
      [date]: [...todayMeals, { ...meal, id: Date.now() }]
    });
  };

  const deleteMeal = (mealId) => {
    const todayMeals = (meals[date] || []).filter(m => m.id !== mealId);
    setMeals({
      ...meals,
      [date]: todayMeals
    });
  };

  const calculateFastingStatus = () => {
    const startHour = parseInt(fastingWindow.start.split(':')[0]);
    const startMin = parseInt(fastingWindow.start.split(':')[1]);
    const endHour = parseInt(fastingWindow.end.split(':')[0]);
    const endMin = parseInt(fastingWindow.end.split(':')[1]);
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTime = currentHour * 60 + currentMin;
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    let isFasting = false;
    let nextEvent = '';

    if (startTime > endTime) {
      // 跨日期的禁食時間
      isFasting = currentTime >= startTime || currentTime < endTime;
      if (isFasting) {
        if (currentTime >= startTime) {
          nextEvent = `進食時間：明天 ${fastingWindow.end}`;
        } else {
          nextEvent = `進食時間：今天 ${fastingWindow.end}`;
        }
      } else {
        nextEvent = `禁食時間：今天 ${fastingWindow.start}`;
      }
    } else {
      // 正常的禁食時間
      isFasting = currentTime >= startTime && currentTime < endTime;
      nextEvent = isFasting ? `禁食到：${fastingWindow.end}` : `禁食從：${fastingWindow.start}`;
    }

    return { isFasting, nextEvent };
  };

  const { isFasting, nextEvent } = calculateFastingStatus();
  const todayMeals = meals[date] || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        margin: '0 auto'
      }}>
        {/* 頭部 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: '700',
            color: '#333'
          }}>168 斷食計劃</h1>
          <p style={{
            margin: '0',
            color: '#666',
            fontSize: '14px'
          }}>間歇斷食 + AI營養追蹤</p>
        </div>

        {/* 斷食狀態 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Clock size={24} style={{ color: isFasting ? '#667eea' : '#764ba2' }} />
              <div>
                <p style={{
                  margin: '0',
                  fontSize: '12px',
                  color: '#999'
                }}>現在狀態</p>
                <p style={{
                  margin: '4px 0 0 0',
                  fontSize: '18px',
                  fontWeight: '700',
                  color: isFasting ? '#667eea' : '#764ba2'
                }}>
                  {isFasting ? '禁食中' : '進食期'}
                </p>
              </div>
            </div>
            <div style={{
              textAlign: 'right'
            }}>
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: '#999'
              }}>下次事件</p>
              <p style={{
                margin: '4px 0 0 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#333'
              }}>{nextEvent}</p>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            fontSize: '13px'
          }}>
            <div style={{
              background: 'rgba(102, 126, 234, 0.1)',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <p style={{ margin: '0', color: '#667eea', fontWeight: '600' }}>進食時間</p>
              <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '16px', fontWeight: '700' }}>
                {fastingWindow.end}
              </p>
            </div>
            <div style={{
              background: 'rgba(118, 75, 162, 0.1)',
              padding: '12px',
              borderRadius: '8px'
            }}>
              <p style={{ margin: '0', color: '#764ba2', fontWeight: '600' }}>禁食時間</p>
              <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '16px', fontWeight: '700' }}>
                {fastingWindow.start}
              </p>
            </div>
          </div>
        </div>

        {/* 營養統計 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <BarChart3 size={20} style={{ color: '#667eea' }} />
            <h2 style={{
              margin: '0',
              fontSize: '18px',
              fontWeight: '700',
              color: '#333'
            }}>今日營養統計</h2>
          </div>

          <div style={{
            background: 'rgba(102, 126, 234, 0.1)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <p style={{
              margin: '0 0 8px 0',
              color: '#667eea',
              fontSize: '12px',
              fontWeight: '600'
            }}>總熱量</p>
            <p style={{
              margin: '0',
              fontSize: '36px',
              fontWeight: '700',
              color: '#333'
            }}>{stats?.calories || 0}</p>
            <p style={{
              margin: '4px 0 0 0',
              color: '#999',
              fontSize: '12px'
            }}>kcal</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px'
          }}>
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0', color: '#ff6b6b', fontSize: '11px', fontWeight: '600' }}>蛋白質</p>
              <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '20px', fontWeight: '700' }}>
                {stats?.protein || 0}g
              </p>
            </div>
            <div style={{
              background: 'rgba(51, 184, 255, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0', color: '#33b8ff', fontSize: '11px', fontWeight: '600' }}>碳水</p>
              <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '20px', fontWeight: '700' }}>
                {stats?.carbs || 0}g
              </p>
            </div>
            <div style={{
              background: 'rgba(255, 193, 7, 0.1)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <p style={{ margin: '0', color: '#ffc107', fontSize: '11px', fontWeight: '600' }}>脂肪</p>
              <p style={{ margin: '4px 0 0 0', color: '#333', fontSize: '20px', fontWeight: '700' }}>
                {stats?.fat || 0}g
              </p>
            </div>
          </div>
        </div>

        {/* 日期選擇 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <Calendar size={20} style={{ color: '#667eea' }} />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              flex: '1',
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          />
        </div>

        {/* 添加食物 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '16px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#333'
          }}>記錄飲食</h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#666',
              marginBottom: '6px',
              fontWeight: '600'
            }}>食物名稱</label>
            <input
              type="text"
              placeholder="例如：雞胸肉、番茄、米飯..."
              value={foodInput}
              onChange={(e) => setFoodInput(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#666',
              marginBottom: '6px',
              fontWeight: '600'
            }}>份量</label>
            <input
              type="text"
              placeholder="例如：150g、1碗、200ml..."
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={calculateNutrition}
            disabled={calculating || !foodInput.trim() || !quantity.trim()}
            style={{
              width: '100%',
              padding: '12px',
              background: calculating ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: calculating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s'
            }}
          >
            <Plus size={18} />
            {calculating ? '計算中...' : '計算並添加'}
          </button>
        </div>

        {/* 今日飲食列表 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          padding: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
        }}>
          <h3 style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: '700',
            color: '#333'
          }}>今日飲食記錄 ({todayMeals.length})</h3>

          {todayMeals.length === 0 ? (
            <p style={{
              margin: '0',
              color: '#999',
              textAlign: 'center',
              padding: '20px 0',
              fontSize: '14px'
            }}>還沒有記錄任何飲食</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayMeals.map((meal) => (
                <div key={meal.id} style={{
                  background: 'rgba(102, 126, 234, 0.05)',
                  border: '1px solid rgba(102, 126, 234, 0.2)',
                  borderRadius: '12px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: '1' }}>
                    <p style={{
                      margin: '0 0 4px 0',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#333'
                    }}>
                      {meal.food} · {meal.quantity}
                    </p>
                    <p style={{
                      margin: '0',
                      fontSize: '12px',
                      color: '#666'
                    }}>
                      {meal.calories} kcal · P:{meal.protein}g C:{meal.carbs}g F:{meal.fat}g
                    </p>
                    <p style={{
                      margin: '4px 0 0 0',
                      fontSize: '11px',
                      color: '#999'
                    }}>
                      {meal.timestamp}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMeal(meal.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ff6b6b',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      marginLeft: '12px'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提示 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          padding: '16px',
          marginTop: '20px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          fontSize: '12px',
          lineHeight: '1.6'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600' }}>💡 使用提示：</p>
          <p style={{ margin: '0 0 4px 0' }}>• 168斷食指16小時禁食，8小時進食</p>
          <p style={{ margin: '0 0 4px 0' }}>• AI會自動計算食物的營養成分</p>
          <p style={{ margin: '0 0 4px 0' }}>• 定期檢查營養平衡，目標蛋白質1.6-2.2g/kg體重</p>
          <p style={{ margin: '0' }}>• 數據本地保存，不需要登錄</p>
        </div>
      </div>
    </div>
  );
};

export default FastingApp;
