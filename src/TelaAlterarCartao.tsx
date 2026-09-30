import React, { useState } from 'react';

interface TelaAlterarCartaoProps {
  userId: string;
}

export function TelaAlterarCartao({ userId }: TelaAlterarCartaoProps) {
  const [nomeTitular, setNomeTitular] = useState('');
  const [numeroCartao, setNumeroCartao] = useState('');
  const [mesExpiracao, setMesExpiracao] = useState('');
  const [anoExpiracao, setAnoExpiracao] = useState('');
  const [cvv, setCvv] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleAtualizarCartao(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    const dadosParaEnvio = {
      user_id: userId,
      dadosCartao: {
        nomeTitular,
        numero: numeroCartao.replace(/\s/g, ''),
        mesExpiracao,
        anoExpiracao,
        cvv
      }
    };

    try {
      const response = await fetch('https://supabase.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosParaEnvio)
      });

      const data = await response.json();

      if (response.ok && data.success !== false) {
        alert('💳 Cartão de crédito atualizado com sucesso para as próximas faturas!');
        // Limpa os campos do formulário por segurança
        setNomeTitular(''); setNumeroCartao(''); setMesExpiracao(''); setAnoExpiracao(''); setCvv('');
      } else {
        alert(`❌ Falha ao atualizar: ${data.error || 'Erro desconhecido'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Erro de conexão ao tentar atualizar o cartão.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#18181c', borderRadius: '16px', border: '1px solid #27272a', maxWidth: '500px', margin: '0 auto' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffffff', marginBottom: '4px' }}>Atualizar Cartão de Crédito</h3>
      <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '20px' }}>Insira os dados do novo cartão. As próximas cobranças mensais da assinatura serão debitadas nele.</p>

      <form onSubmit={handleAtualizarCartao} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Nome impresso no Cartão</label>
          <input type="text" required value={nomeTitular} onChange={e => setNomeTitular(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#ffffff', boxSizing: 'border-box', outline: 'none' }} placeholder="COMO ESTÁ NO CARTÃO" />
        </div>

        <div>
          <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Número do Cartão</label>
          <input type="text" required value={numeroCartao} onChange={e => setNumeroCartao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#ffffff', boxSizing: 'border-box', outline: 'none' }} placeholder="0000 0000 0000 0000" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Mês (MM)</label>
            <input type="text" required maxLength={2} value={mesExpiracao} onChange={e => setMesExpiracao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#ffffff', boxSizing: 'border-box', outline: 'none' }} placeholder="05" />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>Ano (AAAA)</label>
            <input type="text" required maxLength={4} value={anoExpiracao} onChange={e => setAnoExpiracao(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#ffffff', boxSizing: 'border-box', outline: 'none' }} placeholder="2030" />
          </div>
          <div>
            <label style={{ fontSize: '11px', color: '#9ca3af', display: 'block', marginBottom: '4px' }}>CVV</label>
            <input type="text" required maxLength={4} value={cvv} onChange={e => setCvv(e.target.value)} style={{ width: '100%', backgroundColor: '#121215', border: '1px solid #27272a', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#ffffff', boxSizing: 'border-box', outline: 'none' }} placeholder="123" />
          </div>
        </div>

        <button type="submit" disabled={carregando} style={{ width: '100%', backgroundColor: '#db2777', color: '#ffffff', fontWeight: 'bold', padding: '12px', borderRadius: '12px', marginTop: '8px', fontSize: '13px', border: 'none', cursor: 'pointer', opacity: carregando ? 0.5 : 1, boxShadow: '0 10px 15px -3px rgba(219, 39, 119, 0.3)' }}>
          {carregando ? 'Salvando Novo Cartão...' : 'Salvar Novo Cartão de Crédito'}
        </button>
      </form>
    </div>
  );
}