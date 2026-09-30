import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializa o cliente do Supabase específico para escutar o tempo real na tela
const supabaseUrl = "https://jehhyflawpcyhurpbzli.supabase.co";
const supabaseAnonKey = "sb_publishable_V3sV8TkNI0Tvch-iQj3tvw_6UKn0..."; // Chave pública anônima do seu app
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TelaPagamentoProps {
  userId?: string;
  emailOriginal?: string;
  onSucesso?: () => void;
}

export function TelaPagamento({ userId = '', emailOriginal = '', onSucesso = () => {} }: TelaPagamentoProps) {
  const [nomeCliente, setNomeCliente] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // Dados do Cartão
  const [nomeTitular, setNomeTitular] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [mesExpiracao, setMesExpiracao] = useState('');
  const [anoExpiracao, setAnoExpiracao] = useState('');
  const [cvv, setCvv] = useState('');

  const [carregando, setCarregando] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<'cartao' | 'pix'>('cartao');

  // Estados para exibir o Pix gerado pela API
  const [dadosPix, setDadosPix] = useState<{ qrCodeUrl?: string; copiaECola?: string } | null>(null);

  // ========================================================
  // SISTEMA DE TEMPO REAL: ATIVA O ACESSO ASSIM QUE O PIX CAI
  // ========================================================
  useEffect(() => {
    if (!userId || metodoPagamento !== 'pix' || !dadosPix) return;

    console.log("Iniciando escuta em tempo real para o usuário:", userId);

    const canalStatus = supabase
      .channel(`status-assinatura-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'salons',
          filter: `owner_id=eq.${userId}`
        },
        (payload) => {
          console.log("Banco de dados alterado em tempo real:", payload.new);
          
          if (payload.new.subscription_status?.toLowerCase() === 'active') {
            console.log("Pagamento detectado em tempo real! Liberando tela...");
            alert('✨ Pagamento confirmado por PIX! Bem-vinda à GlowAgenda.');
            onSucesso();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canalStatus);
    };
  }, [userId, dadosPix, metodoPagamento, onSucesso]);
  // ========================================================

  async function handleAssinar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setDadosPix(null);

    const dadosParaEnvio = {
      user_id: userId,
      nome_cliente: nomeCliente,
      email: emailOriginal,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, ''),
      billingType: metodoPagamento === 'pix' ? 'PIX' : 'CREDIT_CARD',
      dadosCartao: metodoPagamento === 'cartao' ? {
        nomeTitular,
        numero: numeroCartao.replace(/\s/g, ''),
        mesExpiracao,
        anoExpiracao,
        cvv
      } : null
    };

    try {
      const response = await fetch('https://jehhyflawpcyhurpbzli.supabase.co/functions/v1/bright-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaEnvio)
      });

      const textResponse = await response.text();
      let data = {};
      try {
        data = textResponse ? JSON.parse(textResponse) : {};
      } catch (parseErr) {
        console.error("Erro ao converter resposta para JSON:", textResponse);
      }

      console.log("Resposta completa da API:", data);

      if (response.ok && (data as any).success !== false) {
        if (metodoPagamento === 'pix') {
          setDadosPix({
            qrCodeUrl: (data as any).qrCodeUrl || (data as any).encodedImage || (data as any).pixQrCode || (data as any).image,
            copiaECola: (data as any).copiaECola || (data as any).payload || (data as any).pixCopyPaste
          });
          setCarregando(false);
        } else {
          alert('✨ Assinatura confirmada! Bem-vinda à GlowAgenda.');
          onSucesso(); 
        }
      } else {
        const mensagemErro = (data as any).error || (data as any).message || textResponse || 'Erro desconhecido';
        alert(`❌ Erro no pagamento: ${mensagemErro}`);
        setCarregando(false);
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
      alert('❌ Falha ao conectar ao servidor de pagamento.');
      setCarregando(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f0f13', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', color: '#ffffff', fontFamily: 'sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#18181c', borderRadius: '16px', padding: '24px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '1px solid #27272a' }}>
        
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #27272a', paddingBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '1px', color: '#ec4899', textTransform: 'uppercase' }}>GLOWAGENDA PREMIUM</span>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginTop: '4px' }}>Ativar Assinatura do SaaS</h2>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '22px', fontWeight: '900', color: '#ffffff' }}>R$ 69,90</span>
            <span style={{ fontSize: '11px', color: '#9ca3af', display: 'block' }}>/mês</span>
          </div>
        </div>

        {/* Resumo do Plano */}
        <div style={{ backgroundColor: '#1f1f24', borderRadius: '12px', padding: '16px', marginBottom: '24px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff', margin: 0 }}>Plano Mensal</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>Cobrança recorrente via Asaas</p>
          </div>
          <span style={{ fontSize: '11px', backgroundColor: 'rgba(236, 72, 153, 0.1)', color: '#ec4899', padding: '4px 10px', borderRadius: '6px', fontWeight: '500' }}>Mensal</span>
        </div>

        {/* Seletor de Método de Pagamento */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <button
            type="button"
            onClick={() => { setMetodoPagamento('cartao'); setDadosPix(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              border: metodoPagamento === 'cartao' ? '1px solid #ec4899' : '1px solid #27272a',
              backgroundColor: metodoPagamento === 'cartao' ? 'rgba(236, 72, 153, 0.1)' : '#1f1f24',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <span>💳</span> Cartão de Crédito
          </button>
          
          <button
            type="button"
            onClick={() => { setMetodoPagamento('pix'); setDadosPix(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px',
              borderRadius: '12px',
              border: metodoPagamento === 'pix' ? '1px solid #ec4899' : '1px solid #27272a',
              backgroundColor: metodoPagamento === 'pix' ? 'rgba(236, 72, 153, 0.1)' : '#1f1f24',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            <span>📱</span> Pix Instantâneo
          </button>
        </div>

        <form onSubmit={handleAssinar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Dados Pessoais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Nome Completo</label>
              <input type="text" required value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="Ex: Paula Souza" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>CPF ou CNPJ</label>
              <input type="text" required value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="Apenas números" />
            </div>

            <div>
              <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>WhatsApp</label>
              <input type="text" required value={telefone} onChange={e => setTelefone(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="(DDD) 99999-0000" />
            </div>
          </div>

          {metodoPagamento === 'cartao' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
              <div style={{ borderTop: '1px solid #27272a', paddingTop: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 12px 0' }}>💳 Dados do Cartão de Crédito</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Nome impresso no Cartão</label>
                    <input type="text" required value={nomeTitular} onChange={e => setNomeTitular(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="COMO ESTÁ NO CARTÃO" />
                  </div>

                  <div>
                    <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Número do Cartão</label>
                    <input type="text" required value={numeroCartao} onChange={e => setNumeroCartao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="0000 0000 0000 0000" />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Mês (MM)</label>
                      <input type="text" required maxLength={2} value={mesExpiracao} onChange={e => setMesExpiracao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="05" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Ano (AAAA)</label>
                      <input type="text" required maxLength={4} value={anoExpiracao} onChange={e => setAnoExpiracao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="2030" />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>CVV</label>
                      <input type="text" required maxLength={4} value={cvv} onChange={e => setCvv(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', outline: 'none', color: '#ffffff', boxSizing: 'border-box' }} placeholder="123" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '12px', padding: '20px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dadosPix?.qrCodeUrl ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                  <img 
                    src={dadosPix.qrCodeUrl.startsWith('http') ? dadosPix.qrCodeUrl : `data:image/png;base64,${dadosPix.qrCodeUrl}`} 
                    alt="QR Code Pix" 
                    style={{ width: '160px', height: '160px', borderRadius: '8px', background: '#fff', padding: '8px' }} 
                  />
                  {dadosPix.copiaECola && (
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(dadosPix.copiaECola!); alert('📋 Código Pix Copia e Cola copiado!'); }}
                      style={{ backgroundColor: '#27272a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      Copiar Código Pix Copia e Cola
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
                  Clique no botão abaixo para gerar o QR Code Pix da sua assinatura.
                </div>
              )}
              <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>
                Escaneie o QR Code com o aplicativo do seu banco. A liberação do SaaS é imediata após a compensação.
              </p>
            </div>
          )}

          <button 
            type="submit" 
            disabled={carregando} 
            style={{ width: '100%', backgroundColor: '#db2777', color: '#ffffff', fontWeight: 'bold', padding: '12px', borderRadius: '12px', marginTop: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', opacity: carregando ? 0.5 : 1, boxShadow: '0 10px 15px -3px rgba(219, 39, 119, 0.3)' }}
          >
            {carregando ? 'Gerando Pagamento...' : metodoPagamento === 'pix' ? 'Gerar QR Code Pix' : 'Confirmar e Assinar R$ 69,90/mês'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', margin: '16px 0 0 0' }}>
            🔒 Pagamento processado com segurança via Asaas
          </p>
        </form>
      </div>
    </div>
  );
}