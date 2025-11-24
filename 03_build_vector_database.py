import pandas as pd
import os
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# IMPORTS - Compatible with all LangChain versions

from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings

# Try different import paths for Document
try:
    from langchain_core.documents import Document
except ImportError:
    try:
        from langchain.schema.document import Document
    except ImportError:
        from langchain.schema import Document

# CONFIGURATION

CONFIG = {
    # Input file - change based on which step you completed
    # Option 1: After step 02 only
    # 'input_file': './data/unified_chemicals_enriched.csv',
    
    # Option 2: After step 02b (recommended - has more properties)
    'input_file': './data/unified_chemicals_final.csv',
    
    'chroma_persist_dir': './chroma_db',
    'collection_name': 'chemicals',
    'batch_size': 50,
    'embedding_model': 'all-MiniLM-L6-v2',
}

# DOCUMENT CREATOR

class ChemicalDocumentCreator:
    """Create LangChain documents from chemical data"""
    
    def __init__(self, df):
        self.df = df
        # Check which columns are available
        self.available_columns = set(df.columns)
        print(f"   Available columns: {len(self.available_columns)}")
    
    def create_documents(self):
        """Create Document objects for all chemicals"""
        documents = []
        
        print(f"\n Creating documents for {len(self.df)} chemicals...")
        
        for idx, row in tqdm(self.df.iterrows(), total=len(self.df), desc="Creating documents"):
            doc = self._create_single_document(row)
            if doc:
                documents.append(doc)
        
        print(f" Created {len(documents)} documents")
        return documents
    
    def _create_single_document(self, row):
        """Create a single Document from a row"""
        try:
            # Use pre-generated description as main content
            content = row.get('description', '')
            
            # If no description, generate basic one
            if not content or pd.isna(content):
                content = self._generate_basic_description(row)
            
            # Add extra searchable content
            extra_content = self._generate_searchable_content(row)
            full_content = f"{content} {extra_content}"
            
            # Create metadata (for filtering and display)
            metadata = self._create_metadata(row)
            
            return Document(
                page_content=full_content,
                metadata=metadata
            )
            
        except Exception as e:
            return None
    
    def _create_metadata(self, row):
        """Create metadata dictionary"""
        metadata = {
            'name': str(row.get('name', 'Unknown')),
            'source': str(row.get('source', '')),
            'source_id': str(row.get('source_id', '')),
            'smiles': str(row.get('smiles', '')),
        }
        
        # Molecular formula
        formula = row.get('calc_formula') or row.get('molecular_formula', '')
        metadata['molecular_formula'] = str(formula) if formula else ''
        
        # Numerical properties - handle NaN
        numerical_props = {
            'molecular_weight': 'calc_molecular_weight',
            'logp': 'calc_logp',
            'tpsa': 'calc_tpsa',
            'hbd': 'calc_hbd',
            'hba': 'calc_hba',
            'num_aromatic_rings': 'calc_num_aromatic_rings',
            'num_rings': 'calc_num_rings',
        }
        
        for meta_key, col_name in numerical_props.items():
            value = row.get(col_name)
            if pd.notna(value):
                if meta_key in ['hbd', 'hba', 'num_aromatic_rings', 'num_rings']:
                    metadata[meta_key] = int(value)
                else:
                    metadata[meta_key] = float(value)
            else:
                metadata[meta_key] = 0
        
        # String properties
        string_props = [
            'class_polarity', 'class_compound_type', 'class_size', 
            'class_solubility', 'search_category'
        ]
        
        for prop in string_props:
            value = row.get(prop, '')
            metadata[prop.replace('class_', '')] = str(value) if pd.notna(value) else ''
        
        # Industrial properties (if available from step 02b)
        industrial_props = [
            'boiling_point_celsius', 'density_gcm3', 'flash_point_celsius',
            'application_category', 'safety_risk_level', 'origin_source'
        ]
        
        for prop in industrial_props:
            if prop in self.available_columns:
                value = row.get(prop)
                if pd.notna(value):
                    if prop in ['boiling_point_celsius', 'density_gcm3', 'flash_point_celsius']:
                        metadata[prop] = float(value)
                    else:
                        metadata[prop] = str(value)
                else:
                    metadata[prop] = '' if isinstance(value, str) else 0
        
        return metadata
    
    def _generate_basic_description(self, row):
        """Generate basic description if none exists"""
        name = row.get('name', 'Unknown compound')
        formula = row.get('molecular_formula', '') or row.get('calc_formula', '')
        mw = row.get('calc_molecular_weight', '')
        
        desc = f"{name}"
        if formula:
            desc += f" with formula {formula}"
        if mw and pd.notna(mw):
            desc += f", molecular weight {mw:.2f} g/mol"
        
        return desc
    
    def _generate_searchable_content(self, row):
        """Generate additional searchable content for better retrieval"""
        parts = []
        
        # Add category info
        category = row.get('search_category', '')
        if category and pd.notna(category):
            parts.append(f"Category: {category}")
        
        # Add polarity keywords
        polarity = row.get('class_polarity', '')
        if polarity and pd.notna(polarity):
            polarity_keywords = {
                'very_polar': 'very polar hydrophilic water-soluble',
                'polar': 'polar hydrophilic',
                'moderately_polar': 'moderately polar intermediate',
                'lipophilic': 'lipophilic hydrophobic oil-soluble',
                'very_lipophilic': 'very lipophilic highly hydrophobic'
            }
            parts.append(polarity_keywords.get(polarity, polarity))
        
        # Add compound type keywords
        compound_type = row.get('class_compound_type', '')
        if compound_type and pd.notna(compound_type):
            type_keywords = {
                'aromatic': 'aromatic benzene ring conjugated',
                'polyaromatic': 'polyaromatic multiple rings fused aromatic',
                'alcohol_or_phenol': 'alcohol hydroxyl OH functional group',
                'hydrocarbon': 'hydrocarbon saturated carbon hydrogen alkane',
                'carbonyl': 'carbonyl ketone aldehyde C=O',
                'nitrogen_containing': 'nitrogen amine amide',
                'halogenated': 'halogenated chlorine bromine fluorine',
                'sulfur_containing': 'sulfur thiol sulfide'
            }
            parts.append(type_keywords.get(compound_type, compound_type))
        
        # Add solubility keywords
        solubility = row.get('class_solubility', '')
        if solubility and pd.notna(solubility):
            solubility_keywords = {
                'water_soluble': 'water soluble aqueous dissolves in water',
                'moderately_soluble': 'moderately soluble partial solubility',
                'poorly_soluble': 'poorly soluble insoluble hydrophobic'
            }
            parts.append(solubility_keywords.get(solubility, solubility))
        
        # Add size keywords
        size = row.get('class_size', '')
        if size and pd.notna(size):
            size_keywords = {
                'very_small': 'very small molecule low molecular weight volatile',
                'small': 'small molecule low molecular weight',
                'medium': 'medium sized molecule',
                'large': 'large molecule high molecular weight',
                'very_large': 'very large molecule polymer macromolecule'
            }
            parts.append(size_keywords.get(size, size))
        
        # Add application category (if available from step 02b)
        if 'application_category' in self.available_columns:
            app_cat = row.get('application_category', '')
            if app_cat and pd.notna(app_cat):
                parts.append(f"Applications: {app_cat.replace('|', ' ')}")
        
        # Add safety info (if available)
        if 'safety_risk_level' in self.available_columns:
            safety = row.get('safety_risk_level', '')
            if safety and pd.notna(safety):
                parts.append(f"Safety risk: {safety}")
        
        # Add boiling point range keywords
        if 'boiling_point_celsius' in self.available_columns:
            bp = row.get('boiling_point_celsius')
            if bp and pd.notna(bp):
                if bp < 50:
                    parts.append("low boiling point volatile")
                elif bp < 100:
                    parts.append("moderate boiling point")
                elif bp < 200:
                    parts.append("high boiling point")
                else:
                    parts.append("very high boiling point")
        
        return ' '.join(parts)


# VECTOR DATABASE BUILDER

class VectorDatabaseBuilder:
    """Build and manage ChromaDB vector database using free HuggingFace embeddings"""
    
    def __init__(self):
        print("\n" + "="*70)
        print("INITIALIZING HUGGINGFACE EMBEDDINGS")
        print("="*70)
        print(f"   Model: {CONFIG['embedding_model']}")
        print("   This may take a moment on first run (downloading model ~90MB)...")
        
        # Initialize HuggingFace embeddings (FREE!)
        self.embeddings = HuggingFaceEmbeddings(
            model_name=CONFIG['embedding_model'],
            model_kwargs={'device': 'cpu'},  # Use 'cuda' if you have GPU
            encode_kwargs={'normalize_embeddings': True}
        )
        
        print("    Embeddings model loaded!")
        self.vectorstore = None
    
    def build_database(self, documents):
        """Build vector database from documents"""
        print("\n" + "="*70)
        print(" BUILDING VECTOR DATABASE")
        print("="*70)
        
        # Remove old database if exists
        if os.path.exists(CONFIG['chroma_persist_dir']):
            import shutil
            print("   Removing old database...")
            shutil.rmtree(CONFIG['chroma_persist_dir'])
        
        # Create persist directory
        os.makedirs(CONFIG['chroma_persist_dir'], exist_ok=True)
        
        total_docs = len(documents)
        batch_size = CONFIG['batch_size']
        total_batches = (total_docs + batch_size - 1) // batch_size
        
        print(f"\nTotal documents: {total_docs}")
        print(f"Batch size: {batch_size}")
        print(f"Total batches: {total_batches}")
        print("\nCreating embeddings... This may take a few minutes...")
        
        # Process first batch to create the database
        first_batch = documents[:batch_size]
        
        print(f"\nProcessing batch 1/{total_batches}...")
        
        self.vectorstore = Chroma.from_documents(
            documents=first_batch,
            embedding=self.embeddings,
            persist_directory=CONFIG['chroma_persist_dir'],
            collection_name=CONFIG['collection_name']
        )
        
        # Process remaining batches
        for i in range(batch_size, total_docs, batch_size):
            batch_num = (i // batch_size) + 1
            batch = documents[i:i + batch_size]
            
            print(f"Processing batch {batch_num}/{total_batches}... ({len(batch)} docs)")
            
            self.vectorstore.add_documents(batch)
        
        print(f"\n Vector database built successfully!")
        print(f"Saved to: {CONFIG['chroma_persist_dir']}")
        
        return self.vectorstore
    
    def test_search(self, query, k=3):
        """Test semantic search"""
        print(f"\nQuery: '{query}'")
        print("-" * 50)
        
        results = self.vectorstore.similarity_search(query, k=k)
        
        for i, doc in enumerate(results, 1):
            meta = doc.metadata
            print(f"\n   {i}. {meta.get('name', 'Unknown')}")
            print(f"      Formula: {meta.get('molecular_formula', 'N/A')}")
            print(f"      Type: {meta.get('compound_type', 'N/A')}")
            print(f"      Polarity: {meta.get('polarity', 'N/A')}")
            
            mw = meta.get('molecular_weight', 0)
            if mw:
                print(f"      MW: {mw:.2f} g/mol")
            
            logp = meta.get('logp', 0)
            if logp:
                print(f"      LogP: {logp:.2f}")
            
            # Show industrial properties if available
            bp = meta.get('boiling_point_celsius', 0)
            if bp:
                print(f"      Boiling Point: {bp}°C")
            
            safety = meta.get('safety_risk_level', '')
            if safety:
                print(f"      Safety Risk: {safety}")
        
        return results


# MAIN EXECUTION

def main():
    """Main execution function"""
    
    # Check which input file exists
    print("="*70)
    print(" CHECKING INPUT FILES")
    print("="*70)
    
    possible_inputs = [
        './data/unified_chemicals_final.csv',      # After step 02b
        './data/unified_chemicals_enriched.csv',   # After step 02
    ]
    
    input_file = None
    for f in possible_inputs:
        if os.path.exists(f):
            input_file = f
            break
    
    if not input_file:
        print(" Error: No input file found!")
        print("   Please run one of these first:")
        print("   - python 02_enrich_dataset.py")
        print("   - python 02b_fetch_pubchem_properties.py")
        return None
    
    print(f" Using input file: {input_file}")
    
    # Load dataset
    print("\n" + "="*70)
    print(" LOADING DATASET")
    print("="*70)
    
    df = pd.read_csv(input_file)
    print(f" Loaded {len(df)} compounds")
    print(f" Total columns: {len(df.columns)}")
    
    # Create documents
    print("\n" + "="*70)
    print(" CREATING DOCUMENTS")
    print("="*70)
    
    doc_creator = ChemicalDocumentCreator(df)
    documents = doc_creator.create_documents()
    
    # Build vector database
    try:
        builder = VectorDatabaseBuilder()
        vectorstore = builder.build_database(documents)
        
        # Test searches
        print("\n" + "="*70)
        print(" TESTING SEMANTIC SEARCH")
        print("="*70)
        
        test_queries = [
            "polar solvent for organic synthesis",
            "aromatic compound with low molecular weight",
            "water soluble chemical",
            "non-polar hydrocarbon fuel",
            "alcohol with hydroxyl group",
        ]
        
        for query in test_queries:
            builder.test_search(query, k=3)
        
        print("\n" + "="*70)
        print(" VECTOR DATABASE READY!")
        print("="*70)
        
        print(f"\n Database location: {CONFIG['chroma_persist_dir']}")
        print(f" Total documents indexed: {len(documents)}")
        
        return vectorstore
        
    except Exception as e:
        print(f"\n Error: {e}")
        import traceback
        traceback.print_exc()
        
        return None


if __name__ == "__main__":
    vectorstore = main()