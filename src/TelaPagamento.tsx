import React, { useState } from 'react';

interface TelaPagamentoProps {
  userId: string;
  emailOriginal: string;
  onSucesso: () => void;
}

export function TelaPagamento({ userId, emailOriginal, onSucesso }: TelaPagamentoProps) {
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

  async function handleAssinar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    const dadosParaEnvio = {
      user_id: userId,
      nome_cliente: nomeCliente,
      email: emailOriginal,
      cpfCnpj: cpfCnpj.replace(/\D/g, ''), // remove pontos e traços
      telefone: telefone.replace(/\D/g, ''),
      hora_abertura: "08:00", // Valores padrão que ela edita depois na sua tela de Ajustes
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
      // Chame a sua Edge Function do Supabase que criamos juntos!
      // Substitua pela URL da sua função caso mude
      const response = await fetch('https://supabase.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dadosParaEnvio)
      });

      const data = await response.json();

      if (data.success) {
        alert('✨ Assinatura confirmada! Bem-vinda à GlowAgenda.');
        onSucesso(); // Avança para o Dashboard/Ajustes
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
    <div className="min-h-screen bg-[#121214] flex flex-col items-center justify-center p-4 text-white">
      <div className="w-full max-w-md bg-[#1c1c1f] rounded-2xl p-6 shadow-xl border border-pink-500/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-pink-500">✨ GlowAgenda Premium</h2>
          <p className="text-sm text-gray-400 mt-1">Ative sua assinatura mensal de R\$ 169,90</p>
        </div>

        <form onSubmit={handleAssinar} className="space-y-4">
          {/* Dados Pessoais */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome Completo</label>
            <input type="text" required value={nomeCliente} onChange={e => setNomeCliente(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="Ex: Paula Souza" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">CPF ou CNPJ</label>
              <input type="text" required value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="Apenas números" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">WhatsApp</label>
              <input type="text" required value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="(DDD) 99999-0000" />
            </div>
          </div>

          <div className="border-t border-gray-800 my-4 pt-4">
            <p className="text-sm font-semibold text-pink-400 mb-3">💳 Dados do Cartão de Crédito</p>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Nome impresso no Cartão</label>
            <input type="text" required value={nomeTitular} onChange={e => setNomeTitular(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="COMO ESTÁ NO CARTÃO" />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Número do Cartão</label>
            <input type="text" required value={numeroCartao} onChange={e => setNumeroCartao(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="0000 0000 0000 0000" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Mês (MM)</label>
              <input type="text" required maxLength={2} value={mesExpiracao} onChange={e => setMesExpiracao(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="05" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ano (AAAA)</label>
              <input type="text" required maxLength={4} value={anoExpiracao} onChange={e => setAnoExpiracao(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="2030" />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">CVV</label>
              <input type="text" required maxLength={4} value={cvv} onChange={e => setCvv(e.target.value)} className="w-full bg-[#121214] border border-gray-700 rounded-lg p-2 text-sm focus:border-pink-500 outline-none" placeholder="123" />
            </div>
          </div>

          <button type="submit" disabled={carregando} className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold p-3 rounded-lg mt-4 text-sm transition duration-200 disabled:opacity-50">
            {carregando ? 'Processando Assinatura...' : 'Confirmar e Ativar Conta'}
          </button>
        </form>
      </div>
    </div>
  );
}