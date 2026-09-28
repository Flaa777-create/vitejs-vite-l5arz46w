import React, { useState } from 'react';

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

  async function handleAssinar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    const dadosParaEnvio = {
      user_id: userId,
      nome_cliente: nomeCliente,
      email: emailOriginal,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''),
      telefone: telefone.replace(/\D/g, ''),
      hora_abertura: "08:00", 
      hora_fechamento: "18:00",
      dadosCartao: {
        nomeTitular,
        numero: numeroCartao.replace(/\s/g, ''),
        mesExpiracao,
        anoExpiracao,
        cvv
      }
    };

    try {
      const response = await fetch('https://jehhyflawpcyhurpbzli.supabase.co/functions/v1/bright-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnvio)
      });

      const data = await response.json();

      if (data.success) {
        alert('✨ Assinatura confirmada! Bem-vinda à GlowAgenda.');
        onSucesso(); 
      } else {
        alert(`❌ Erro no pagamento: ${data.error}`);
      }
    } catch (err) {
      alert('❌ Falha ao conectar ao servidor de pagamento.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f13] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-xl bg-[#18181c] rounded-2xl p-6 shadow-2xl border border-gray-800">
        
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-800 pb-4">
          <div>
            <span className="text-xs font-bold tracking-wider text-pink-500 uppercase">GLOWAGENDA PREMIUM</span>
            <h2 className="text-xl font-bold text-white mt-1">Ativar Assinatura do SaaS</h2>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-white">R$ 69,90</span>
            <span className="text-xs text-gray-400 block">/mês</span>
          </div>
        </div>

        {/* Resumo do Plano */}
        <div className="bg-[#1f1f24] rounded-xl p-4 mb-6 border border-gray-800 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-white">Plano Mensal</p>
            <p className="text-xs text-gray-400">Cobrança recorrente via Asaas</p>
          </div>
          <span className="text-xs bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded-md font-medium">Mensal</span>
        </div>

        {/* Seletor de Método de Pagamento */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setMetodoPagamento('cartao')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              metodoPagamento === 'cartao' 
                ? 'border-pink-500 bg-pink-500/10 text-white' 
                : 'border-gray-800 bg-[#1f1f24] text-gray-400 hover:border-gray-700'
            }`}
          >
            <span>💳</span> Cartão de Crédito
          </button>
          
          <button
            type="button"
            onClick={() => setMetodoPagamento('pix')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
              metodoPagamento === 'pix' 
                ? 'border-pink-500 bg-pink-500/10 text-white' 
                : 'border-gray-800 bg-[#1f1f24] text-gray-400 hover:border-gray-700'
            }`}
          >
            <span>📱</span> Pix Instantâneo
          </button>
        </div>

        <form onSubmit={handleAssinar} className="space-y-4">
          {/* Dados Pessoais */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Nome Completo</label>
              <input type="text" required value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="Ex: Paula Souza" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 block mb-1">CPF ou CNPJ</label>
                <input type="text" required value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="Apenas números" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">WhatsApp</label>
                <input type="text" required value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="(DDD) 99999-0000" />
              </div>
            </div>
          </div>

          {metodoPagamento === 'cartao' ? (
            <div className="space-y-3 pt-2">
              <div className="border-t border-gray-800 pt-3">
                <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider mb-2">💳 Dados do Cartão de Crédito</p>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome impresso no Cartão</label>
                <input type="text" required value={nomeTitular} onChange={e => setNomeTitular(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="COMO ESTÁ NO CARTÃO" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Número do Cartão</label>
                <input type="text" required value={numeroCartao} onChange={e => setNumeroCartao(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="0000 0000 0000 0000" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Mês (MM)</label>
                  <input type="text" required maxLength={2} value={mesExpiracao} onChange={e => setMesExpiracao(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="05" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Ano (AAAA)</label>
                  <input type="text" required maxLength={4} value={anoExpiracao} onChange={e => setAnoExpiracao(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="2030" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">CVV</label>
                  <input type="text" required maxLength={4} value={cvv} onChange={e => setCvv(e.target.value)} className="w-full bg-[#121215] border border-gray-800 rounded-lg p-2.5 text-sm focus:border-pink-500 outline-none text-white" placeholder="123" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#121215] border border-gray-800 rounded-xl p-6 text-center space-y-3">
              <div className="w-32 h-32 bg-white/5 mx-auto rounded-lg flex items-center justify-center border border-gray-800">
                <span className="text-xs text-gray-400">[ QR Code PIX Asaas ]</span>
              </div>
              <p className="text-xs text-gray-400">Escaneie o QR Code com o aplicativo do seu banco. A liberação do SaaS é imediata após a compensação.</p>
            </div>
          )}

          <button type="submit" disabled={carregando} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold p-3 rounded-xl mt-4 text-sm transition duration-200 disabled:opacity-50 shadow-lg shadow-pink-600/20">
            {carregando ? 'Processando Assinatura...' : 'Confirmar e Assinar R$ 69,90/mês'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
          🔒 Pagamento processado com segurança via Asaas
        </p>
      </div>
    </div>
  );
}