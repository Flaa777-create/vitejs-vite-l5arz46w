import { useState } from 'react';
import { supabase } from '../supabaseClient'; // Verifique se o caminho do seu cliente Supabase está correto

export function CadastrarServico() {
  const [nomeServico, setNomeServico] = useState('');
  const [preco, setPreco] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleSalvarServico(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);

    try {
      // 1. Pega o ID da dona do salão que está logada no app
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("Erro: Você precisa fazer login como proprietária primeiro!");
        return;
      }

      // 2. Envia os dados para a tabela 'servicos' combinando com as suas colunas exatas
      const { error } = await supabase
        .from('servicos')
        .insert([
          {
            owner_id: user.id, // Vincula o serviço à conta dela
            nome_servico: nomeServico,
            preco: parseFloat(preco), // Converte o texto para número decimal (ex: 120.00)
            duracao_minutos: parseInt(duracaoMinutos) // Converte para número inteiro (ex: 60)
          }
        ]);

      if (error) throw error;

      alert('Serviço cadastrado com sucesso!');
      
      // Limpa os campos após salvar
      setNomeServico('');
      setPreco('');
      setDuracaoMinutos('');

    } catch (error: any) {
      alert('Erro ao salvar no banco: ' + error.message);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#d53f8c', textAlign: 'center' }}>Adicionar Novo Serviço</h2>
      
      <form onSubmit={handleSalvarServico} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Nome do Serviço</label>
          <input 
            type="text" 
            placeholder="Ex: Unhas de fibra" 
            value={nomeServico}
            onChange={(e) => setNomeServico(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Preço (R$)</label>
          <input 
            type="number" 
            step="0.01" 
            placeholder="Ex: 150.00" 
            value={preco}
            onChange={(e) => setPreco(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Duração (em minutos)</label>
          <input 
            type="number" 
            placeholder="Ex: 60" 
            value={duracaoMinutos}
            onChange={(e) => setDuracaoMinutos(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={carregando}
          style={{ 
            backgroundColor: '#d53f8c', 
            color: 'white', 
            padding: '12px', 
            border: 'none', 
            borderRadius: '8px', 
            cursor: 'pointer',
            fontWeight: 'bold',
            marginTop: '10px'
          }}
        >
          {carregando ? 'Salvando...' : 'Gravar Serviço'}
        </button>
      </form>
    </div>
  );
}