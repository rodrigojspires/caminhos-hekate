import { runSeedProd } from './seed.prod'

runSeedProd()
  .then(() => {
    console.log('🎉 Seed concluído')
  })
  .catch((error) => {
    console.error('❌ Erro no seed:', error)
    process.exit(1)
  })
